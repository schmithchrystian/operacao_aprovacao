import type { DashboardGoal } from "@/contracts/dashboard";
import {
  mockNextLessons,
  mockPerformanceSummaries,
  mockRankings,
  mockSelectedContests,
  mockStudyStats,
} from "@/mocks";
import { assertOwnership, requireUser } from "@/server/authorization";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { getUserGamification } from "@/server/services/gamification";
import { recalculateDailyGoal, recalculateWeeklyGoal, recalculateStreak } from "@/server/services/study-tracking";
import type { DashboardDTO } from "@/contracts/dashboard";

/**
 * Serviço de agregação de leitura do dashboard do aluno (Fase 5 — backend/leitura).
 *
 * Este serviço SÓ agrega: junta o usuário autenticado (`UserRepository`), o curso da
 * próxima aula recomendada (`CourseRepository`) e os estados pré-computados em
 * `src/mocks/data/dashboard-*`, devolvendo o `DashboardDTO` já pronto para a UI.
 *
 * Nenhuma regra de pontos/XP/nível/tempo válido/sequência é calculada aqui:
 * - Pontos, XP, nível e conquistas vêm do motor de gamificação real (Fase 8,
 *   `@/server/services/gamification`), lido a partir de `PointTransaction`/`UserAchievement`
 *   (ledger auditável) — não são mais literais fixos.
 * - `streakDays`/`goals` (Fase 12 — agente `study-tracking`): agora vêm de
 *   `recalculateStreak`/`recalculateDailyGoal`/`recalculateWeeklyGoal`
 *   (`@/server/services/study-tracking`), que recalculam a partir de `StudySession`/
 *   `PointTransaction` reais e persistem em `UserStreak`/`DailyGoal`/`WeeklyGoal` — não são
 *   mais literais fixos do mock (`mockGamificationStates`/`mockGoals`, mantidos só como
 *   histórico de decisão em `src/mocks/data/dashboard-{gamification,goals}.ts`). Num processo
 *   mock "frio" (sem nenhuma `StudySession`/`PointTransaction` recente para o usuário), estes
 *   valores começam honestamente em zero — ver pendência no relatório da Fase 12.
 * - TODO(Fase 9 — agente `gamification`): o motor de ranking real já existe
 *   (`@/server/services/gamification/ranking`, `getRanking`), mas este widget simples de
 *   dashboard (posição + total no concurso) ainda lê `mockRankings` em vez de chamar
 *   `getRanking({ periodType: "ALL_TIME", scopeType: "CONTEST", scopeKeyRaw: contestId })` —
 *   os valores do mock foram ajustados para não divergir do resultado real (ver
 *   `dashboard-ranking.ts`), mas a troca de fonte fica como pendência (fora do escopo desta
 *   fase, que focou no motor/backend do ranking).
 * - TODO(Fase 12 — agente `study-tracking`): tempo estudado/aulas concluídas/simulados/
 *   percentual de acertos (`study.*`) ainda vêm do mock (`mockStudyStats`) — a fonte real e
 *   mais rica (evolução semanal/mensal, aproveitamento por matéria, etc.) já existe em
 *   `getTrackingOverview` (`@/server/services/study-tracking/tracking-overview`), consumida
 *   pela página dedicada de Acompanhamento; portar este widget resumido do dashboard principal
 *   para a mesma fonte fica como pendência (mantido aqui para não regredir o layout desta
 *   fase, focada no serviço de acompanhamento).
 * - TODO(Fase 7 — cursos/concursos): `selectedContest` e a próxima aula recomendada
 *   (módulo/aula) devem passar a vir de repositórios reais de `Contest`/`Module`/`Lesson`
 *   quando existirem; hoje só `CourseRepository` existe.
 *
 * Autorização (ADR-0006, CLAUDE.md §11): quem chama só pode ler o próprio dashboard —
 * `requireUser` garante sessão real (nunca aceitar `userId` do corpo da requisição) e
 * `assertOwnership` impede que um usuário autenticado leia o dashboard de outro (anti-IDOR).
 */

interface GoalLike {
  targetMinutes: number | null;
  targetPoints: number | null;
  progressMinutes: number;
  progressPoints: number;
  achieved: boolean;
}

/** Mapeia o resultado real de `recalculateDailyGoal`/`recalculateWeeklyGoal` para
 *  `DashboardGoal` (contrato já existente da Fase 5) — prioriza a dimensão de PONTOS (default
 *  configurado, `STUDY_TRACKING_OVERVIEW.dailyGoalTargetPoints`/`weeklyGoalTargetPoints`) e só
 *  cai para minutos quando não há alvo de pontos definido. */
function toDashboardGoal(goal: GoalLike, periodDescription: string): DashboardGoal {
  const usesPoints = goal.targetPoints !== null;
  const target = usesPoints ? goal.targetPoints! : (goal.targetMinutes ?? 0);
  const progress = usesPoints ? goal.progressPoints : goal.progressMinutes;
  const unit = usesPoints ? "pontos" : "minutos";

  return {
    description: `Conquiste ${target} ${unit} ${periodDescription}`,
    target,
    progress,
    unit,
    completed: goal.achieved,
  };
}

export async function getStudentDashboard(userId: string): Promise<DashboardDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const user = await repos.users.findById(userId);
  if (!user) {
    throw new NotFoundError("Aluno não encontrado.");
  }

  const study = mockStudyStats[userId];
  const performanceSummary = mockPerformanceSummaries[userId];
  const ranking = mockRankings[userId];
  const contest = mockSelectedContests[userId];

  if (!study || !performanceSummary || !ranking || !contest) {
    throw new NotFoundError("Dados de dashboard indisponíveis para este aluno.");
  }

  // Fonte real de pontos/XP/nível/conquistas (Fase 8). `getUserGamification` já reaplica
  // `requireUser`/`assertOwnership`; chamado depois da checagem já feita no topo desta função
  // (redundante, mas seguro e barato).
  const gamification = await getUserGamification(userId);

  // Fonte real de sequência/metas (Fase 12) — recalcula e persiste a partir de
  // `StudySession`/`PointTransaction` (nunca `Date.now()` aqui; `now` é a única leitura do
  // relógio real desta função, injetada explicitamente nos três serviços).
  const now = new Date();
  const [streak, dailyGoal, weeklyGoal] = await Promise.all([
    recalculateStreak(userId, now),
    recalculateDailyGoal(userId, now),
    recalculateWeeklyGoal(userId, now),
  ]);

  const nextLessonEntity = mockNextLessons[userId];
  let nextLesson: DashboardDTO["nextLesson"] = null;
  if (nextLessonEntity) {
    const course = await repos.courses.findById(nextLessonEntity.courseId);
    nextLesson = {
      courseId: nextLessonEntity.courseId,
      courseTitle: course?.title ?? nextLessonEntity.moduleTitle,
      moduleTitle: nextLessonEntity.moduleTitle,
      lessonId: nextLessonEntity.lessonId,
      lessonTitle: nextLessonEntity.lessonTitle,
      progressPercent: nextLessonEntity.progressPercent,
      href: nextLessonEntity.href,
    };
  }

  // Conquistas desbloqueadas (ledger real), mais recentes primeiro — só as `unlocked`.
  const recentAchievements = gamification.achievements
    .filter((achievement) => achievement.unlocked && achievement.unlockedAt !== null)
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))
    .slice(0, 5)
    .map((achievement) => ({
      id: achievement.key,
      name: achievement.name,
      icon: achievement.icon,
      achievedAt: achievement.unlockedAt as string,
    }));

  return {
    identity: {
      studentName: user.name,
      selectedContestId: contest.contestId,
      selectedContestName: contest.contestName,
    },
    gamification: {
      level: { index: gamification.level.level.index, name: gamification.level.level.name },
      points: gamification.points,
      xp: gamification.xp,
      currentLevelXp: gamification.level.currentLevelXp,
      nextLevelXp: gamification.level.nextLevelXp,
      streakDays: streak.currentStreak,
    },
    study: {
      weeklyStudyMinutes: study.weeklyStudyMinutes,
      lessonsCompleted: study.lessonsCompleted,
      mockExamsTaken: study.mockExamsTaken,
      accuracyPercent: study.accuracyPercent,
    },
    ranking: {
      position: ranking.position,
      totalParticipants: ranking.totalParticipants,
      contestId: ranking.contestId,
    },
    nextLesson,
    goals: {
      daily: toDashboardGoal(dailyGoal, "estudando hoje"),
      weekly: toDashboardGoal(weeklyGoal, "essa semana"),
    },
    performanceSummary,
    studyHoursSeries: study.studyHoursSeries,
    subjectPerformance: study.subjectPerformance,
    recentAchievements,
  };
}
