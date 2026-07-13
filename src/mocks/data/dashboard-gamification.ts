/**
 * Mock de gamificação pré-computada por aluno (ADR-0011, CLAUDE.md §23).
 *
 * TODO(Fase 8 — agente `gamification`): estes valores (pontos, XP, nível, sequência) são
 * hoje literais fixos para alimentar o dashboard de leitura. A fonte definitiva será o
 * cálculo real sobre `PointTransaction`/`GamificationEvent`/`UserStreak`, sempre no
 * backend, idempotente e auditável (CLAUDE.md §15/§16). Este arquivo NÃO deve conter
 * lógica de cálculo — apenas o estado já pronto.
 */

/**
 * Nomes dos níveis na ordem oficial (CLAUDE.md §16). Índice 1 = "Recruta" .. 7 = "Comandante".
 * Faixas de XP mínimo, ícone e benefício visual de cada nível são definitivos apenas na
 * Fase 8 — aqui servem só para rotular o estado mock de forma consistente.
 */
export const GAMIFICATION_LEVEL_NAMES = [
  "Recruta",
  "Aspirante",
  "Combatente",
  "Especialista",
  "Veterano",
  "Elite",
  "Comandante",
] as const;

export interface GamificationStateEntity {
  /** 1-based, ver `GAMIFICATION_LEVEL_NAMES`. */
  levelIndex: number;
  levelName: string;
  points: number;
  xp: number;
  /** XP mínimo do nível atual. */
  currentLevelXp: number;
  /** XP mínimo do próximo nível; `null` quando `levelIndex` já é o máximo (7). */
  nextLevelXp: number | null;
  streakDays: number;
}

/** Chave: `userId` (ver `src/mocks/data/users.ts`). */
export const mockGamificationStates: Record<string, GamificationStateEntity> = {
  "user-1": {
    levelIndex: 2,
    levelName: GAMIFICATION_LEVEL_NAMES[1],
    points: 4230,
    xp: 1380,
    currentLevelXp: 1000,
    nextLevelXp: 2500,
    streakDays: 6,
  },
  "user-2": {
    levelIndex: 4,
    levelName: GAMIFICATION_LEVEL_NAMES[3],
    points: 12800,
    xp: 6100,
    currentLevelXp: 5000,
    nextLevelXp: 9000,
    streakDays: 12,
  },
  "user-3": {
    levelIndex: 3,
    levelName: GAMIFICATION_LEVEL_NAMES[2],
    points: 7400,
    xp: 3200,
    currentLevelXp: 2500,
    nextLevelXp: 5000,
    streakDays: 0,
  },
  "user-4": {
    levelIndex: 7,
    levelName: GAMIFICATION_LEVEL_NAMES[6],
    points: 30500,
    xp: 18000,
    currentLevelXp: 15000,
    // Nível máximo: não há "próximo nível" para a barra de progresso.
    nextLevelXp: null,
    streakDays: 30,
  },
};
