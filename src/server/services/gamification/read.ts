import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import { ACHIEVEMENTS } from "./achievements";
import type { UserGamificationStats } from "./achievements";
import { computeLevel, type ComputedLevel } from "./levels";

/**
 * Leitura agregada de gamificação (Fase 8 — agente `gamification`). Todo cálculo aqui é
 * derivado do ledger (`GamificationEvent`/`PointTransaction`/`UserAchievement`) — nunca
 * recebe pontos/XP/nível/conquista prontos de fora (CLAUDE.md §15).
 */

/**
 * Deriva `UserGamificationStats` do ledger de eventos já processados (auditável — cada
 * contagem é rastreável a um `GamificationEvent` real). Campos cuja fonte definitiva ainda
 * não existe nesta fase permanecem neutros (ver TODOs em `./achievements.ts`).
 */
export async function computeUserGamificationStats(userId: string): Promise<UserGamificationStats> {
  const repos = getRepositories();
  const events = await repos.gamificationEvents.listByUserId(userId);

  const countByType = (type: (typeof events)[number]["type"]): number =>
    events.filter((event) => event.type === type).length;

  const hasType = (type: (typeof events)[number]["type"]): boolean =>
    events.some((event) => event.type === type);

  // Aproximação até `UserStreak` real (Fase 12 — study-tracking): os eventos `STREAK_7`/
  // `STREAK_30` só são emitidos quando o streak cruza o marco correspondente, então sua
  // presença é um piso confiável (nunca superestima) do streak atual.
  let streakDays = 0;
  if (hasType("STREAK_30")) {
    streakDays = 30;
  } else if (hasType("STREAK_7")) {
    streakDays = 7;
  }

  return {
    lessonsCompleted: countByType("LESSON_COMPLETED"),
    // TODO(Fase 12 — study-tracking): calendário real de atividade da 1ª semana.
    firstWeekFullyActive: false,
    streakDays,
    mockExamsCompleted: countByType("MOCK_EXAM_COMPLETED"),
    // TODO(Fase 10 — simulations): sem fonte própria de acerto por simulado ainda.
    bestMockExamAccuracyPercent: 0,
    mockExamsAboveAccuracyThreshold: 0,
    questionsCorrect: countByType("QUESTION_CORRECT"),
    // TODO(Fase 12 — study-tracking): tempo válido acumulado real.
    studyHours: 0,
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
