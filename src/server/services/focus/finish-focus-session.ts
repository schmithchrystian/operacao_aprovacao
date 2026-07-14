import { FOCUS, GAMIFICATION_REWARDS } from "@/config/business";
import type { FinishFocusInput, FinishFocusResultDTO } from "@/contracts/focus";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { ConflictError, NotFoundError } from "@/server/errors";
import { eventBus } from "@/server/events";
import { getRepositories } from "@/server/repositories";
import type { FocusSessionEntity } from "@/server/repositories/contracts/focus-session-repository";
import {
  buildIdempotencyKey,
  registerGamificationEventHandlers,
  type PomodoroCompletedPayload,
} from "@/server/services/gamification";
import { withFocusLock } from "./focus-lock";
import { toFocusSessionDTO } from "./mappers";

/**
 * Registra os consumidores de gamificação assim que este módulo é carregado — mesmo padrão de
 * `study-tracking/record-heartbeat.ts`/`flashcards/review-card.ts` (idempotente; seguro com
 * múltiplos imports/hot-reload). Este é o EMISSOR REAL de `PomodoroCompleted` — o handler já
 * existe pronto desde a Fase 8 (`@/server/services/gamification/handlers.ts`), só aguardava
 * esta fase (ver TODO em `.../gamification/events.ts`).
 */
registerGamificationEventHandlers();

/** Duração mínima (segundos) de tempo ATIVO exigida para pontuar. Modos com alvo fixo usam uma
 *  fração do alvo (`FOCUS.minDurationFraction`); o modo `free` (sem alvo) usa um mínimo absoluto
 *  em minutos (`FOCUS.freeModeMinScoringMinutes`) — não há alvo do qual tirar fração. */
function computeMinRequiredActiveSeconds(targetSeconds: number): number {
  if (targetSeconds > 0) {
    return targetSeconds * FOCUS.minDurationFraction;
  }
  return FOCUS.freeModeMinScoringMinutes * 60;
}

/**
 * Finaliza uma sessão de Modo Foco (Fase 15 — CLAUDE.md §14/§15/§25).
 *
 * REGRA DURA desta fase: o contador chegar a zero no NAVEGADOR nunca é suficiente. A pontuação
 * (`PomodoroCompleted`, 50 pontos) só é concedida quando, no SERVIDOR:
 * 1. a sessão está `ACTIVE` (nunca finaliza a mesma sessão duas vezes — chamar de novo numa
 *    sessão já `FINISHED`/`DISCARDED` rejeita com `ConflictError` IMEDIATAMENTE, antes de
 *    qualquer recomputação — mesmo padrão de `simulations/submit-and-finalize.ts`, "esta
 *    tentativa já foi finalizada");
 * 2. `activeSeconds` (acumulado heartbeat a heartbeat por `focusHeartbeat`, nunca `endedAt -
 *    startedAt` bruto) atinge o mínimo exigido — fração do alvo do modo, ou minutos mínimos
 *    absolutos no modo `free`;
 * 3. `validHeartbeatCount` (heartbeats que de fato somaram tempo, não descartados por aba
 *    oculta/ociosidade/duplicidade) atinge um mínimo — "atividade real", não só decurso de tempo.
 *
 * Sessão que NÃO atinge (2)/(3) é SEMPRE registrada como `FINISHED` (nunca fica presa `ACTIVE`
 * para sempre), apenas sem pontuar (`scored: false`) — os metadados do formulário (objetivo/
 * conteúdo/nível de foco/dúvida) são gravados normalmente, porque são informativos e não
 * dependem da pontuação.
 *
 * Idempotência da pontuação: `idempotencyKey = pomodoro-completed:<userId>:<sessionId>`
 * (`buildIdempotencyKey`) — a MESMA sessão nunca credita 50 pontos duas vezes, defendido em
 * camadas (guard de status abaixo — a barreira PRINCIPAL, que nem chega a tentar reemitir — mais
 * `InMemoryEventBus` + motor de gamificação como defesa em profundidade, ver
 * `@/server/services/gamification/engine.ts`).
 *
 * ATOMICIDADE DA SEÇÃO CRÍTICA (ajuste da revisão da Fase 15 — MÉDIO): "ler sessão → checar
 * ACTIVE → validar → salvar FINISHED → emitir evento" roda DENTRO de `withFocusLock(userId, …)`,
 * simétrico ao `startFocusSession`. Sem isso, duas finalizações CONCORRENTES da mesma sessão
 * poderiam AMBAS ler `status === "ACTIVE"` (o `findById` cede o event loop antes de qualquer
 * `save`) e AMBAS emitir `PomodoroCompleted` — a dupla-pontuação só seria barrada pela janela de
 * idempotência do EventBus/motor, que tem corrida no mock. Com o lock, só a 1ª executa a seção
 * inteira; a 2ª reavalia com a sessão já `FINISHED` e cai em `ConflictError` antes de reemitir.
 * O lock é por `userId` (não `sessionId`) — igual ao `start`, e mais conservador (um usuário só
 * tem uma sessão ativa por vez); nenhuma função chamada aqui readquire o mesmo lock (sem
 * reentrância/deadlock: `eventBus.emit`/handlers de gamificação não tocam `withFocusLock`).
 *
 * TODO(fase de banco): a barreira DEFINITIVA é a constraint `@unique` na `idempotencyKey` de
 * `GamificationEvent`/`PointTransaction` + a gravação de `FINISHED` e a emissão na MESMA
 * transação (mesmo TODO de `@/server/services/gamification/engine.ts`). O `withFocusLock` em
 * memória fecha a corrida dentro de um processo; múltiplas instâncias só ficam seguras com a
 * barreira no banco.
 */
export async function finishFocusSession(
  userId: string,
  input: FinishFocusInput,
  now: Date = new Date(),
): Promise<FinishFocusResultDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();

  return withFocusLock(userId, async () => {
    const existing = await repos.focusSessions.findById(userId, input.sessionId);
    if (!existing) {
      throw new NotFoundError("Sessão de foco não encontrada.");
    }
    if (existing.status !== "ACTIVE") {
      throw new ConflictError("Esta sessão de foco já foi finalizada.");
    }

    const minRequiredSeconds = computeMinRequiredActiveSeconds(existing.targetSeconds);
    const meetsDuration = existing.activeSeconds >= minRequiredSeconds;
    const meetsActivity = existing.validHeartbeatCount >= FOCUS.minValidHeartbeatsToScore;
    const qualifiesForPoints = meetsDuration && meetsActivity;

    const nowIso = now.toISOString();
    const finished: FocusSessionEntity = {
      ...existing,
      status: "FINISHED",
      endedAt: nowIso,
      goalAchieved: input.goalAchieved ?? null,
      contentStudied: input.contentStudied ?? null,
      focusLevel: input.focusLevel ?? null,
      doubtNote: input.doubtNote ?? null,
      cyclesCompleted: qualifiesForPoints ? 1 : 0,
      scored: qualifiesForPoints,
      updatedAt: nowIso,
    };
    const saved = await repos.focusSessions.save(finished);

    let points = 0;
    let xp = 0;
    let reasonNotScored: string | null = null;

    if (qualifiesForPoints) {
      const idempotencyKey = buildIdempotencyKey("POMODORO_COMPLETED", userId, saved.id);
      await eventBus.emit<PomodoroCompletedPayload>({
        type: "PomodoroCompleted",
        payload: { userId, pomodoroSessionId: saved.id },
        idempotencyKey,
        occurredAt: now,
      });
      const transaction = await repos.pointTransactions.findByIdempotencyKey(idempotencyKey);
      points = transaction?.points ?? GAMIFICATION_REWARDS.POMODORO_COMPLETED.points;
      xp = transaction?.xp ?? GAMIFICATION_REWARDS.POMODORO_COMPLETED.xp;
    } else if (!meetsDuration) {
      reasonNotScored = "Tempo ativo abaixo do mínimo exigido para este modo.";
    } else {
      reasonNotScored = "Atividade insuficiente registrada durante a sessão.";
    }

    auditLog({
      operation: "focus.session-finished",
      userId,
      entity: "FocusSession",
      entityId: saved.id,
      result: "success",
      correlationId: saved.id,
      metadata: {
        scored: qualifiesForPoints,
        activeSeconds: saved.activeSeconds,
        targetSeconds: saved.targetSeconds,
        heartbeatCount: saved.heartbeatCount,
        validHeartbeatCount: saved.validHeartbeatCount,
      },
    });

    return {
      session: toFocusSessionDTO(saved),
      scored: qualifiesForPoints,
      points,
      xp,
      reasonNotScored,
    };
  });
}
