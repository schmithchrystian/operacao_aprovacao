import { LESSON_COMPLETION_MIN_PERCENT, STUDY_TRACKING } from "@/config/business";
import type { HeartbeatInput, HeartbeatResultDTO, LessonCompletionDTO } from "@/contracts/progress";
import type { LessonStatus } from "@/contracts/courses";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { ForbiddenError, NotFoundError, RateLimitError } from "@/server/errors";
import { eventBus } from "@/server/events";
import { getRepositories } from "@/server/repositories";
import type { LessonProgressStatus } from "@/server/repositories/contracts/lesson-progress-repository";
import {
  ACHIEVEMENTS,
  buildIdempotencyKey,
  registerGamificationEventHandlers,
  type CourseCompletedPayload,
  type LessonCompletedPayload,
  type ModuleCompletedPayload,
} from "@/server/services/gamification";
import { computeProgressForCourse } from "@/server/services/courses/shared";
import { assertActiveEnrollment } from "./enrollment";
import { evaluateHeartbeat, sumIntervalSeconds, type CoveredInterval } from "./heartbeat-evaluator";
import { checkHeartbeatRateLimit, heartbeatRateLimitKey } from "./rate-limit";

/**
 * Registra os consumidores de gamificação assim que este módulo é carregado. Ainda um
 * side-effect de import (TODO — fase de infraestrutura: mover para um bootstrap central de
 * processo, ex.: `instrumentation.ts`, em vez de acoplado ao primeiro service que importar
 * gamification). Idempotente (`registerGamificationEventHandlers` guarda um flag interno) —
 * seguro mesmo com múltiplos imports/hot-reload.
 */
registerGamificationEventHandlers();

type ComputedCourseProgress = Awaited<ReturnType<typeof computeProgressForCourse>>;

function findLessonStatus(computed: ComputedCourseProgress, lessonId: string): LessonStatus | null {
  for (const courseModule of computed.modules) {
    const found = courseModule.lessons.find((entry) => entry.lesson.id === lessonId);
    if (found) return found.status;
  }
  return null;
}

/**
 * Recebe um heartbeat de vídeo (sinais BRUTOS do player) e reconstrói, no servidor, o
 * progresso/tempo válido da aula (CLAUDE.md §13/§14). Autorização (ADR-0006): `requireUser` +
 * `assertOwnership` — o progresso gravado é sempre o do próprio usuário autenticado; `userId`
 * nunca vem do corpo da requisição.
 *
 * Não confia em NENHUM valor do cliente para decidir conclusão/tempo:
 * - `watchedPercent` é recomputado a partir da união de intervalos de posição VALIDADOS
 *   (nunca do `positionSeconds` isolado, nem de qualquer "percentual" do cliente);
 * - a duração canônica vem do catálogo (`Lesson.durationMinutes`), nunca de
 *   `input.durationSeconds` (só um sinal de plausibilidade, não usado como denominador);
 * - o intervalo real entre heartbeats é medido pelo relógio do SERVIDOR (`Date.now()`),
 *   nunca por `input.clientTimestamp` (que só serve para detectar duplicidade exata).
 */
export async function recordHeartbeat(userId: string, input: HeartbeatInput): Promise<HeartbeatResultDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const rateLimitKey = heartbeatRateLimitKey(userId, input.lessonId, input.sessionId);
  if (!checkHeartbeatRateLimit(rateLimitKey)) {
    throw new RateLimitError("Heartbeat enviado com frequência excessiva.");
  }

  const repos = getRepositories();

  const lesson = await repos.lessons.findById(input.lessonId);
  if (!lesson) {
    throw new NotFoundError("Aula não encontrada.");
  }

  const courseModule = await repos.modules.findById(lesson.moduleId);
  if (!courseModule) {
    throw new NotFoundError("Módulo não encontrado.");
  }

  // Matrícula ativa é obrigatória ANTES de creditar qualquer progresso/ponto — sem isto, a 1ª
  // aula (sempre `available`) permitiria a um não matriculado farmar os 100 pontos de conclusão
  // (achado de segurança Fase 7 — ALTO). Ver `./enrollment.ts`.
  await assertActiveEnrollment(userId, courseModule.courseId);

  // Aula bloqueada não pode registrar progresso (CLAUDE.md §12) — verificado ANTES de
  // processar o heartbeat, com o estado de liberação atual (independente desta chamada).
  const computedBefore = await computeProgressForCourse(userId, courseModule.courseId);
  const lessonStatusBefore = findLessonStatus(computedBefore, lesson.id);
  if (lessonStatusBefore === null || lessonStatusBefore === "locked") {
    throw new ForbiddenError("Esta aula está bloqueada e não pode registrar progresso.");
  }

  const receivedAt = Date.now();
  const previousSession = await repos.studySessions.findSession(userId, input.lessonId, input.sessionId);

  // Sessões simultâneas suspeitas: outra sessão (aula diferente ou mesma aula com outro
  // `sessionId`) do MESMO usuário com heartbeat recente — um humano não assiste duas
  // reproduções ao mesmo tempo (CLAUDE.md §14).
  const concurrencyWindowMs = STUDY_TRACKING.concurrentSessionWindowSeconds * 1000;
  const sinceIso = new Date(receivedAt - concurrencyWindowMs).toISOString();
  const recentSessions = await repos.studySessions.listRecentSessionsByUserId(userId, sinceIso);
  const hasConcurrentSession = recentSessions.some(
    (existing) => !(existing.lessonId === input.lessonId && existing.id === input.sessionId),
  );

  const canonicalDurationSeconds = lesson.durationMinutes * 60;

  const evaluation = evaluateHeartbeat({
    userId,
    lessonId: input.lessonId,
    sessionId: input.sessionId,
    signal: {
      positionSeconds: input.positionSeconds,
      playing: input.playing,
      tabVisible: input.tabVisible,
      playbackRate: input.playbackRate,
      clientTimestamp: input.clientTimestamp,
    },
    receivedAt,
    previousSession,
    canonicalDurationSeconds,
  });

  const flags = [...evaluation.flags];
  let persistedSession = evaluation.updatedSession;

  if (hasConcurrentSession && (evaluation.addedValidSeconds > 0 || evaluation.newInterval)) {
    // Descarta o crédito desta chamada (tempo válido e cobertura de vídeo) — mantém a posição
    // atualizada (útil para retomar), mas não soma como assistido enquanto houver suspeita.
    persistedSession = {
      ...evaluation.updatedSession,
      validSeconds: previousSession?.validSeconds ?? 0,
      coveredIntervals: previousSession?.coveredIntervals ?? [],
    };
    flags.push("concurrent_session_suspected");
  }

  await repos.studySessions.saveSession(persistedSession);

  // `watchedPercent` é recomputado a partir da união de TODAS as sessões da aula — nunca do
  // percentual/posição isolada desta chamada.
  const allSessions = await repos.studySessions.listSessionsByUserAndLesson(userId, input.lessonId);
  const allIntervals: CoveredInterval[] = allSessions.flatMap((s) => s.coveredIntervals);
  const totalCoveredSeconds = sumIntervalSeconds(allIntervals);
  const watchedFraction =
    canonicalDurationSeconds > 0 ? Math.min(1, totalCoveredSeconds / canonicalDurationSeconds) : 0;

  const existingProgress = await repos.lessonProgress.findByUserAndLesson(userId, input.lessonId);
  const wasCompletedBefore = existingProgress?.status === "completed";

  let progressStatus: LessonProgressStatus;
  if (wasCompletedBefore) {
    progressStatus = "completed";
  } else if (watchedFraction >= LESSON_COMPLETION_MIN_PERCENT) {
    progressStatus = "completed";
  } else if (watchedFraction > 0 || persistedSession.heartbeatCount > 1) {
    progressStatus = "in_progress";
  } else {
    progressStatus = "not_started";
  }

  // Nunca "desconclui": uma vez completed, watchedPercent só pode subir/manter.
  const finalWatchedFraction = wasCompletedBefore
    ? Math.max(existingProgress?.watchedPercent ?? 0, watchedFraction)
    : watchedFraction;

  const nowIso = new Date(receivedAt).toISOString();
  const justCompleted = !wasCompletedBefore && progressStatus === "completed";

  await repos.lessonProgress.upsert({
    userId,
    lessonId: input.lessonId,
    status: progressStatus,
    watchedPercent: finalWatchedFraction,
    completedAt: wasCompletedBefore ? (existingProgress?.completedAt ?? nowIso) : justCompleted ? nowIso : null,
  });

  // Status de liberação (locked/available/in_progress/completed) recomputado após a gravação —
  // usado na resposta e, quando `justCompleted`, no progresso do módulo/curso da "Vitória".
  const computedAfter = await computeProgressForCourse(userId, courseModule.courseId);
  // `lessonStatusBefore` já está narrowed para excluir `null`/`"locked"` pelo throw acima.
  const lessonStatusAfter = findLessonStatus(computedAfter, input.lessonId) ?? lessonStatusBefore;

  let completion: LessonCompletionDTO | null = null;

  if (justCompleted) {
    // TODO(MÉDIO — fase de banco / agente `database`+`backend`): hoje a idempotência de
    // conclusão/pontuação é garantida por checagens de leitura (store em memória). No Prisma,
    // a gravação de `LessonProgress` + emissão do evento + `GamificationEvent`/`PointTransaction`
    // deve ocorrer numa ÚNICA transação, apoiada nas constraints únicas reais
    // (`LessonProgress @@unique([userId, lessonId])`, `*.idempotencyKey @unique`), para eliminar
    // a janela de corrida entre dois heartbeats concorrentes que cruzem o limiar ao mesmo tempo.
    const lessonIdempotencyKey = buildIdempotencyKey("LESSON_COMPLETED", userId, input.lessonId);

    // Conquistas ANTES de qualquer evento desta chamada — usado só para detectar o que é
    // NOVO ao final (diff), nunca para decidir se algo já foi concedido (isso é
    // responsabilidade exclusiva do motor de gamificação/`UserAchievementRepository.unlock`).
    const achievementsBefore = await repos.userAchievements.listByUserId(userId);

    // Emite o evento de domínio — o consumidor de gamificação credita os pontos (idempotente
    // em duas camadas: EventBus + segunda checagem no motor, ver `services/gamification`).
    await eventBus.emit<LessonCompletedPayload>({
      type: "LessonCompleted",
      payload: { userId, lessonId: input.lessonId, lessonTitle: lesson.title },
      idempotencyKey: lessonIdempotencyKey,
      occurredAt: new Date(receivedAt),
    });

    const transaction = await repos.pointTransactions.findByIdempotencyKey(lessonIdempotencyKey);
    const moduleBefore = computedBefore.modules.find((m) => m.module.id === courseModule.id);
    const moduleAfter = computedAfter.modules.find((m) => m.module.id === courseModule.id);

    // Módulo/curso concluídos (Fase 8 — gamification): disparo no PONTO real de conclusão,
    // coordenado com o progresso agregado já recomputado acima (`computeProgressForCourse`).
    // Só dispara quando o progresso cruza de <100% para 100% NESTA chamada — nunca reemite em
    // chamadas seguintes (já estaria em 100% "antes" também).
    const moduleJustCompleted =
      (moduleBefore?.progressPercent ?? 0) < 100 && (moduleAfter?.progressPercent ?? 0) === 100;
    if (moduleJustCompleted) {
      await eventBus.emit<ModuleCompletedPayload>({
        type: "ModuleCompleted",
        payload: {
          userId,
          moduleId: courseModule.id,
          moduleTitle: courseModule.title,
          courseId: courseModule.courseId,
        },
        idempotencyKey: buildIdempotencyKey("MODULE_COMPLETED", userId, courseModule.id),
        occurredAt: new Date(receivedAt),
      });
    }

    const courseJustCompleted =
      computedBefore.courseProgressPercent < 100 && computedAfter.courseProgressPercent === 100;
    if (courseJustCompleted) {
      const course = await repos.courses.findById(courseModule.courseId);
      await eventBus.emit<CourseCompletedPayload>({
        type: "CourseCompleted",
        payload: {
          userId,
          courseId: courseModule.courseId,
          courseTitle: course?.title ?? courseModule.courseId,
        },
        idempotencyKey: buildIdempotencyKey("COURSE_COMPLETED", userId, courseModule.courseId),
        occurredAt: new Date(receivedAt),
      });
    }

    // Primeira conquista desbloqueada nesta chamada (por aula/módulo/curso), se houver — ver
    // limitação documentada em `LessonCompletionDTO.achievementUnlocked` (`@/contracts/progress`).
    const achievementsAfter = await repos.userAchievements.listByUserId(userId);
    const newlyUnlockedRecord = achievementsAfter.find(
      (after) => !achievementsBefore.some((before) => before.achievementKey === after.achievementKey),
    );
    const unlockedDefinition = newlyUnlockedRecord
      ? ACHIEVEMENTS.find((achievement) => achievement.key === newlyUnlockedRecord.achievementKey)
      : undefined;

    completion = {
      lessonId: input.lessonId,
      lessonTitle: lesson.title,
      points: transaction?.points ?? 0,
      xp: transaction?.xp ?? 0,
      moduleProgressPercent: moduleAfter?.progressPercent ?? 0,
      courseProgressPercent: computedAfter.courseProgressPercent,
      achievementUnlocked:
        unlockedDefinition && newlyUnlockedRecord
          ? {
              id: unlockedDefinition.key,
              name: unlockedDefinition.name,
              icon: unlockedDefinition.icon,
              achievedAt: newlyUnlockedRecord.unlockedAt,
            }
          : null,
    };
  }

  auditLog({
    operation: "study-tracking.heartbeat",
    userId,
    entity: "Lesson",
    entityId: input.lessonId,
    result: "success",
    correlationId: `${input.sessionId}:${input.clientTimestamp}`,
    metadata: {
      flags,
      watchedPercent: Math.round(finalWatchedFraction * 10_000) / 100,
      justCompleted,
    },
  });

  return {
    lessonId: input.lessonId,
    watchedPercent: Math.round(finalWatchedFraction * 10_000) / 100,
    status: lessonStatusAfter,
    resumePositionSeconds: persistedSession.lastPositionSeconds,
    justCompleted,
    completion,
    flags,
  };
}
