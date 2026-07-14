import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import {
  ALL_HISTORY_SINCE_ISO,
  isFirstWeekFullyActive,
  toActivityDates,
} from "@/server/services/study-tracking/activity-days";
import { ACHIEVEMENTS } from "./achievements";
import type { UserGamificationStats } from "./achievements";
import { computeLevel, type ComputedLevel } from "./levels";

/**
 * Leitura agregada de gamificação (Fase 8 — agente `gamification`). Todo cálculo aqui é
 * derivado do ledger (`GamificationEvent`/`PointTransaction`/`UserAchievement`) — nunca
 * recebe pontos/XP/nível/conquista prontos de fora (CLAUDE.md §15).
 *
 * `streakDays`/`firstWeekFullyActive`/`studyHours` importam SÓ o núcleo puro de
 * `@/server/services/study-tracking/activity-days` (nenhuma dependência de volta para
 * gamification) — nunca o barril `study-tracking/index.ts` nem `./streak.ts`, que dependem
 * DESTE domínio (`buildIdempotencyKey`/`eventBus`) para emitir `StreakReached`. Importar o
 * barril aqui fecharia um ciclo de import; importar só a folha pura não.
 */

/**
 * Deriva `UserGamificationStats` do ledger de eventos já processados (auditável — cada
 * contagem é rastreável a um `GamificationEvent` real), mais as métricas reais da Fase 12
 * (`UserStreakRepository`/`StudySession`, agregadas aqui só por LEITURA — o recálculo/persistência
 * de `UserStreak` é feito por `recalculateStreak`, chamado a partir de
 * `tracking-overview`/`dashboard-service`). Campos cuja fonte definitiva ainda não existe
 * permanecem neutros (ver TODOs em `./achievements.ts`).
 */
export async function computeUserGamificationStats(userId: string): Promise<UserGamificationStats> {
  const repos = getRepositories();
  const events = await repos.gamificationEvents.listByUserId(userId);

  const countByType = (type: (typeof events)[number]["type"]): number =>
    events.filter((event) => event.type === type).length;

  // Fase 12 (study-tracking): sequência real, lida do cache materializado
  // (`UserStreakRepository`) — `0` enquanto a linha ainda não existe (nenhum recálculo rodou
  // para este usuário ainda, ex.: processo mock "frio" sem `StudySession` registrada).
  const userStreak = await repos.userStreaks.findByUserId(userId);
  const streakDays = userStreak?.currentStreak ?? 0;

  // Fase 12 (study-tracking): calendário real de atividade (`StudySession.validSeconds > 0`,
  // nunca `fim - início` bruto — CLAUDE.md §14), usado para "1ª semana completa" e horas de estudo.
  const sessions = await repos.studySessions.listRecentSessionsByUserId(userId, ALL_HISTORY_SINCE_ISO);
  const activeDates = toActivityDates(sessions);
  const firstWeekFullyActive = isFirstWeekFullyActive(activeDates);
  const studyHours = sessions.reduce((sum, session) => sum + session.validSeconds, 0) / 3600;

  return {
    lessonsCompleted: countByType("LESSON_COMPLETED"),
    firstWeekFullyActive,
    streakDays,
    mockExamsCompleted: countByType("MOCK_EXAM_COMPLETED"),
    // TODO(Fase 10 — simulations): sem fonte própria de acerto por simulado ainda.
    bestMockExamAccuracyPercent: 0,
    mockExamsAboveAccuracyThreshold: 0,
    questionsCorrect: countByType("QUESTION_CORRECT"),
    studyHours,
    flashcardsMastered: countByType("FLASHCARD_CORRECT"),
    weeklyGoalsCompleted: countByType("WEEKLY_GOAL_COMPLETED"),
  };
}

export interface UserAchievementView {
  key: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  /** ISO 8601, ou `null` enquanto não desbloqueada. */
  unlockedAt: string | null;
}

export interface UserGamificationView {
  userId: string;
  points: number;
  xp: number;
  level: ComputedLevel;
  achievements: UserAchievementView[];
}

/**
 * Agrega o estado de gamificação do usuário (saldo, nível, progresso e conquistas). Autorização
 * (ADR-0006): só o próprio usuário autenticado pode ler seu estado — `requireUser` +
 * `assertOwnership`, nunca aceitando `userId` de uma fonte não autenticada.
 */
export async function getUserGamification(userId: string): Promise<UserGamificationView> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const { points, xp } = await repos.pointTransactions.sumByUserId(userId);
  const level = computeLevel(xp);

  const unlockedRecords = await repos.userAchievements.listByUserId(userId);
  const unlockedByKey = new Map(unlockedRecords.map((record) => [record.achievementKey, record.unlockedAt]));

  const achievements: UserAchievementView[] = ACHIEVEMENTS.map((definition) => ({
    key: definition.key,
    name: definition.name,
    description: definition.description,
    icon: definition.icon,
    unlocked: unlockedByKey.has(definition.key),
    unlockedAt: unlockedByKey.get(definition.key) ?? null,
  }));

  return { userId, points, xp, level, achievements };
}
