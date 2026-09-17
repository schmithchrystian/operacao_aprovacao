import { validSecondsWithinWindow } from "@/server/services/study-tracking/activity-days";
import { listUserActivitySamples } from "@/server/services/study-tracking/activity-samples";
import { env } from "@/config/env";
import type { RankingParticipantEntity } from "@/mocks";
import { getRepositories } from "@/server/repositories";
import type { RankingRawMetrics } from "./formula";
import type { RankingPeriodWindow } from "./scope";

/**
 * Coleta das métricas brutas do ranking (Fase 9 — agente `gamification`, CLAUDE.md §17).
 *
 * Fonte por métrica (pluggável — cada uma pode ser trocada independentemente quando a fase
 * dona existir, sem tocar em `formula.ts`/`recalculate.ts`):
 * - `lessonsCompleted`: REAL, via `LessonProgressRepository` (aulas com `status === "completed"`
 *   dentro da janela do período) — "aulas concluídas via progresso" (CLAUDE.md §17).
 * - `validHours`: REAL, soma de `StudySession.validSeconds` (nunca `fim - início` bruto,
 *   CLAUDE.md §14) de todas as sessões das aulas do usuário.
 * - `consistency`: REAL, fração de dias com pelo menos um `GamificationEvent` dentro da janela
 *   do período (proxy honesto de constância a partir do ledger auditável — ver nota em
 *   `computeConsistency`). TODO(Fase 12 — `study-tracking`/`UserStreak`): substituir por
 *   calendário de atividade definitivo quando existir.
 * - `mockExamPerformance`: REAL (Fase 10 — `simulations`), via `MockExamAttemptRepository` —
 *   média de `scorePercent` das tentativas `FINISHED` na janela; cai para o mock
 *   (`fallbackPercent`/`mockExamAccuracyPercent`) quando o usuário não tem tentativa finalizada
 *   na janela (ver `computeMockExamPerformance`).
 * - `goalsCompleted`: MOCK — TODO(Fases 11/12/15 — `study-tracking`): sem `DailyGoal`/
 *   `WeeklyGoal` real ainda.
 *
 * Participantes SEM usuário real em `UserRepository` (a maioria do dataset de demonstração,
 * `src/mocks/data/ranking-participants.ts`) usam os campos `fallback*` do próprio mock para
 * `lessonsCompleted`/`validHours`/`consistency` — documentado ali.
 */
export interface RankingGatheredMetrics extends RankingRawMetrics {
  /** Intervalo (ms) entre a primeira e a última atividade — desempate "menor tempo para pontuar". */
  timeToScoreMs: number;
  /** Pontos/XP de exibição (política `xp = points`, `config/business.ts`). */
  points: number;
  xp: number;
  /** Sequência (dias) de exibição — proxy via marcos `STREAK_7`/`STREAK_30` do ledger quando real. */
  streakDays: number;
}

function isoWithinWindow(iso: string, window: RankingPeriodWindow): boolean {
  const time = Date.parse(iso);
  return time >= window.startDate.getTime() && time <= window.endDate.getTime();
}

function countDistinctUtcDays(isoDates: readonly string[]): number {
  const days = new Set(isoDates.map((iso) => iso.slice(0, 10)));
  return days.size;
}

/**
 * Desempenho em simulados (Fase 10 — agente `simulations`): média de `scorePercent` das
 * tentativas `FINISHED` do usuário com `finishedAt` dentro da janela do período. Cai para
 * `fallbackPercent` (mock, `RankingParticipantEntity.mockExamAccuracyPercent`) quando o usuário
 * não tem nenhuma tentativa finalizada na janela — evita que quem nunca fez simulado apareça
 * com 0% (penalização indevida) em vez de "sem dado" antes de existir histórico real.
 */
async function computeMockExamPerformance(
  userId: string,
  window: RankingPeriodWindow,
  fallbackPercent: number,
): Promise<number> {
  const repos = getRepositories();
  const attempts = await repos.mockExamAttempts.listByUserId(userId);
  const finishedInWindow = attempts.filter(
    (attempt): attempt is typeof attempt & { finishedAt: string; scorePercent: number } =>
      attempt.status === "FINISHED" &&
      attempt.finishedAt !== null &&
      attempt.scorePercent !== null &&
      isoWithinWindow(attempt.finishedAt, window),
  );

  if (finishedInWindow.length === 0) {
    return env.DATA_SOURCE === "mock" ? fallbackPercent : 0;
  }

  const total = finishedInWindow.reduce((sum, attempt) => sum + attempt.scorePercent, 0);
  return Math.round((total / finishedInWindow.length) * 100) / 100;
}

/**
 * Fração de dias ativos dentro de uma janela. Quando a janela não tem `totalDays` fixo
 * (`ALL_TIME`), o denominador é o próprio período de atividade do usuário (primeira → última
 * data em `activityIsoDates`, mínimo 1 dia) — não faz sentido dividir pela idade da
 * plataforma inteira; o que importa é "quão consistente a pessoa foi enquanto esteve ativa".
 */
function computeConsistency(
  activityIsoDates: readonly string[],
  window: RankingPeriodWindow,
): number {
  const withinWindow = activityIsoDates.filter((iso) => isoWithinWindow(iso, window));
  const activeDays = countDistinctUtcDays(withinWindow);

  if (window.totalDays !== null) {
    return window.totalDays > 0 ? Math.min(1, activeDays / window.totalDays) : 0;
  }

  if (withinWindow.length === 0) {
    return 0;
  }
  const times = withinWindow.map((iso) => Date.parse(iso));
  const spanDays = Math.max(
    1,
    Math.round((Math.max(...times) - Math.min(...times)) / (24 * 60 * 60 * 1000)) + 1,
  );
  return Math.min(1, activeDays / spanDays);
}

/** Coleta as métricas de UM participante para a janela de período informada. */
export async function gatherRawMetrics(
  participant: RankingParticipantEntity,
  window: RankingPeriodWindow,
): Promise<RankingGatheredMetrics> {
  const repos = getRepositories();
  const user = await repos.users.findById(participant.userId);

  if (!user && env.DATA_SOURCE !== "mock")
    throw new Error("Participante de ranking não encontrado.");
  if (!user) {
    // Participante de demonstração sem usuário/ledger reais — ver cabeçalho de
    // `ranking-participants.ts`. `timeToScoreMs` vem do intervalo mock de atividade.
    const timeToScoreMs = Math.max(
      0,
      Date.parse(participant.lastActivityAt) - Date.parse(participant.firstActivityAt),
    );
    return {
      mockExamPerformance: participant.mockExamAccuracyPercent,
      lessonsCompleted: participant.fallbackLessonsCompleted,
      consistency: participant.fallbackConsistency,
      validHours: participant.fallbackValidHours,
      goalsCompleted: participant.mockGoalsCompletedCount,
      timeToScoreMs,
      points: participant.fallbackPoints,
      xp: participant.fallbackPoints,
      streakDays: Math.round(participant.fallbackConsistency * 30),
    };
  }

  const progress = await repos.lessonProgress.listByUserId(participant.userId);
  const completedInWindow = progress.filter(
    (row) =>
      row.status === "completed" &&
      row.completedAt !== null &&
      isoWithinWindow(row.completedAt, window),
  );

  const sessions = await listUserActivitySamples(participant.userId);
  const totalValidSeconds = sessions
    .filter((sample) => sample.status !== "DISCARDED")
    .reduce(
      (sum, sample) =>
        sum +
        validSecondsWithinWindow(sample, window.startDate, new Date(window.endDate.getTime() + 1)),
      0,
    );
  const [dailyGoals, weeklyGoals, streak] = await Promise.all([
    repos.dailyGoals.listByUserId(participant.userId),
    repos.weeklyGoals.listByUserId(participant.userId),
    repos.userStreaks.findByUserId(participant.userId),
  ]);
  const goalsCompleted = [...dailyGoals, ...weeklyGoals].filter(
    (goal) => goal.achieved && goal.achievedAt && isoWithinWindow(goal.achievedAt, window),
  ).length;

  const events = await repos.gamificationEvents.listByUserId(participant.userId);
  const consistency = computeConsistency(
    events.map((event) => event.createdAt),
    window,
  );

  const eventTimes = events
    .filter((event) => isoWithinWindow(event.createdAt, window))
    .map((event) => Date.parse(event.createdAt));
  const timeToScoreMs =
    eventTimes.length > 0 ? Math.max(...eventTimes) - Math.min(...eventTimes) : 0;

  const { points, xp } = await repos.pointTransactions.sumByUserId(participant.userId);
  const streakDays = streak?.currentStreak ?? 0;

  const mockExamPerformance = await computeMockExamPerformance(
    participant.userId,
    window,
    participant.mockExamAccuracyPercent,
  );

  return {
    mockExamPerformance,
    lessonsCompleted: completedInWindow.length,
    consistency,
    validHours: totalValidSeconds / 3600,
    goalsCompleted,
    timeToScoreMs,
    points,
    xp,
    streakDays,
  };
}
