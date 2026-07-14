import { STUDY_TRACKING_OVERVIEW } from "@/config/business";
import { eventBus } from "@/server/events";
import { getRepositories } from "@/server/repositories";
import { addDaysIso, weekStartIso } from "@/server/services/study-plan/date-utils";
import {
  buildIdempotencyKey,
  registerGamificationEventHandlers,
  type DailyGoalCompletedPayload,
  type WeeklyGoalCompletedPayload,
} from "@/server/services/gamification";
import { ALL_HISTORY_SINCE_ISO, DEFAULT_TIMEZONE, sumValidSecondsByDate, toCalendarDateIso } from "./activity-days";

/** Mesmo padrão de `./streak.ts` — idempotente, seguro com múltiplos imports/hot-reload. */
registerGamificationEventHandlers();

export interface GoalView {
  targetMinutes: number | null;
  targetPoints: number | null;
  progressMinutes: number;
  progressPoints: number;
  achieved: boolean;
  achievedAt: string | null;
}

export interface DailyGoalView extends GoalView {
  date: string;
}

export interface WeeklyGoalView extends GoalView {
  weekStart: string;
}

/**
 * Critério de conclusão da meta — PURO: uma meta sem NENHUM alvo definido nunca é considerada
 * concluída (evita "meta vazia" auto-completar); quando há alvo de pontos e/ou minutos, TODOS
 * os alvos definidos precisam ser atingidos (semântica E, não OU) — decisão documentada aqui
 * porque CLAUDE.md só diz "meta diária (ex.: X pontos/minutos no dia)" sem detalhar a
 * combinação dos dois.
 */
export function isGoalAchieved(input: {
  targetPoints: number | null;
  targetMinutes: number | null;
  progressPoints: number;
  progressMinutes: number;
}): boolean {
  const hasAnyTarget = input.targetPoints !== null || input.targetMinutes !== null;
  if (!hasAnyTarget) return false;

  const pointsOk = input.targetPoints === null || input.progressPoints >= input.targetPoints;
  const minutesOk = input.targetMinutes === null || input.progressMinutes >= input.targetMinutes;
  return pointsOk && minutesOk;
}

/** Soma de `PointTransaction.points` (ledger real da Fase 8 — nunca um valor do cliente),
 *  agrupada por dia civil na timezone informada. */
async function sumPointsByDate(userId: string, timezone: string): Promise<Map<string, number>> {
  const repos = getRepositories();
  const transactions = await repos.pointTransactions.listByUserId(userId);
  const byDate = new Map<string, number>();
  for (const transaction of transactions) {
    const date = toCalendarDateIso(transaction.createdAt, timezone);
    byDate.set(date, (byDate.get(date) ?? 0) + transaction.points);
  }
  return byDate;
}

/**
 * Recalcula a meta DIÁRIA (data = hoje, na timezone informada) a partir do ledger de pontos
 * (Fase 8) e do tempo válido (Fase 7), e persiste o resultado (`DailyGoalRepository` guarda só
 * alvo + `achieved`/`achievedAt` — o progresso é sempre recomputado ao vivo, nunca cacheado;
 * ver nota em `@/server/repositories/contracts/daily-goal-repository`).
 *
 * Emite `DailyGoalCompleted` (idempotente por `<userId>:<data>` — nunca 2x no mesmo dia) só na
 * chamada que CRUZA de não-concluída para concluída; chamadas seguintes no mesmo dia já
 * concluído são no-op (o `wasAchieved` guard evita até tentar reemitir).
 *
 * TODO(MÉDIO — fase de banco): o `upsert` que marca `achieved=true` e o `emit` do award NÃO são
 * atômicos (mesmo caso de `streak.ts` e do TODO de transação única em
 * `@/server/services/gamification/engine.ts`). Um crash entre os dois deixaria a meta marcada
 * concluída sem o award, e o guard `wasAchieved` nunca mais reemitiria — PERDENDO o bônus (não
 * duplica: a `idempotencyKey` barra a duplicação; o risco é perder). Latente hoje (mock
 * single-threaded); no Prisma, upsert + emissão devem partilhar a mesma transação (ou outbox).
 */
export async function recalculateDailyGoal(
  userId: string,
  now: Date,
  timezone: string = DEFAULT_TIMEZONE,
): Promise<DailyGoalView> {
  const repos = getRepositories();
  const date = toCalendarDateIso(now.toISOString(), timezone);
  const existing = await repos.dailyGoals.findByUserIdAndDate(userId, date);

  const targetPoints = existing?.targetPoints ?? STUDY_TRACKING_OVERVIEW.dailyGoalTargetPoints;
  const targetMinutes = existing?.targetMinutes ?? null;

  const [pointsByDate, sessions] = await Promise.all([
    sumPointsByDate(userId, timezone),
    repos.studySessions.listRecentSessionsByUserId(userId, ALL_HISTORY_SINCE_ISO),
  ]);
  const secondsByDate = sumValidSecondsByDate(sessions, timezone);

  const progressPoints = pointsByDate.get(date) ?? 0;
  const progressMinutes = Math.floor((secondsByDate.get(date) ?? 0) / 60);

  const wasAchieved = existing?.achieved ?? false;
  const achievedNow = isGoalAchieved({ targetPoints, targetMinutes, progressPoints, progressMinutes });
  const justAchieved = !wasAchieved && achievedNow;
  const achieved = wasAchieved || achievedNow;
  const achievedAt = wasAchieved ? (existing?.achievedAt ?? null) : achievedNow ? now.toISOString() : null;

  const updated = await repos.dailyGoals.upsert({
    userId,
    date,
    targetMinutes,
    targetPoints,
    achieved,
    achievedAt,
    now,
  });

  if (justAchieved) {
    await eventBus.emit<DailyGoalCompletedPayload>({
      type: "DailyGoalCompleted",
      payload: { userId, dailyGoalId: updated.id, date },
      idempotencyKey: buildIdempotencyKey("DAILY_GOAL_COMPLETED", userId, date),
      occurredAt: now,
    });
  }

  return {
    date,
    targetMinutes: updated.targetMinutes,
    targetPoints: updated.targetPoints,
    progressMinutes,
    progressPoints,
    achieved: updated.achieved,
    achievedAt: updated.achievedAt,
  };
}

/**
 * Recalcula a meta SEMANAL (semana civil — segunda a domingo, `weekStartIso`, mesmo
 * agrupamento do calendário do plano de estudos, Fase 11) somando pontos/minutos de
 * segunda-feira até `now` (semana em andamento soma o que já ocorreu; não espera o domingo
 * fechar para refletir progresso). Mesma semântica de idempotência de `recalculateDailyGoal`
 * (incluindo o mesmo TODO(MÉDIO — fase de banco) de atomicidade upsert+emit descrito lá).
 */
export async function recalculateWeeklyGoal(
  userId: string,
  now: Date,
  timezone: string = DEFAULT_TIMEZONE,
): Promise<WeeklyGoalView> {
  const repos = getRepositories();
  const today = toCalendarDateIso(now.toISOString(), timezone);
  const weekStart = weekStartIso(today);
  const weekEndExclusive = addDaysIso(weekStart, 7);

  const existing = await repos.weeklyGoals.findByUserIdAndWeekStart(userId, weekStart);
  const targetPoints = existing?.targetPoints ?? STUDY_TRACKING_OVERVIEW.weeklyGoalTargetPoints;
  const targetMinutes = existing?.targetMinutes ?? null;

  const [pointsByDate, sessions] = await Promise.all([
    sumPointsByDate(userId, timezone),
    repos.studySessions.listRecentSessionsByUserId(userId, ALL_HISTORY_SINCE_ISO),
  ]);
  const secondsByDate = sumValidSecondsByDate(sessions, timezone);

  let progressPoints = 0;
  let progressSeconds = 0;
  for (let cursor = weekStart; cursor < weekEndExclusive; cursor = addDaysIso(cursor, 1)) {
    progressPoints += pointsByDate.get(cursor) ?? 0;
    progressSeconds += secondsByDate.get(cursor) ?? 0;
  }
  const progressMinutes = Math.floor(progressSeconds / 60);

  const wasAchieved = existing?.achieved ?? false;
  const achievedNow = isGoalAchieved({ targetPoints, targetMinutes, progressPoints, progressMinutes });
  const justAchieved = !wasAchieved && achievedNow;
  const achieved = wasAchieved || achievedNow;
  const achievedAt = wasAchieved ? (existing?.achievedAt ?? null) : achievedNow ? now.toISOString() : null;

  const updated = await repos.weeklyGoals.upsert({
    userId,
    weekStart,
    targetMinutes,
    targetPoints,
    achieved,
    achievedAt,
    now,
  });

  if (justAchieved) {
    await eventBus.emit<WeeklyGoalCompletedPayload>({
      type: "WeeklyGoalCompleted",
      payload: { userId, weeklyGoalId: updated.id, weekStart },
      idempotencyKey: buildIdempotencyKey("WEEKLY_GOAL_COMPLETED", userId, weekStart),
      occurredAt: now,
    });
  }

  return {
    weekStart,
    targetMinutes: updated.targetMinutes,
    targetPoints: updated.targetPoints,
    progressMinutes,
    progressPoints,
    achieved: updated.achieved,
    achievedAt: updated.achievedAt,
  };
}
