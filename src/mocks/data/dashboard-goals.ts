/**
 * Mock de missão diária e meta semanal pré-computadas por aluno (ADR-0011, CLAUDE.md §23).
 *
 * TODO(Fase 12 — agente `study-tracking`) / TODO(Fase 8 — agente `gamification`): alvo e
 * progresso reais dependem de tempo válido de estudo e de pontos calculados no backend
 * (CLAUDE.md §15 — meta diária: 150 pontos; meta semanal: 500 pontos). Aqui os valores já
 * vêm prontos (pré-computados) só para a UI exibir.
 */

export interface GoalEntity {
  description: string;
  target: number;
  progress: number;
  unit: string;
  completed: boolean;
}

export interface GoalsEntity {
  daily: GoalEntity;
  weekly: GoalEntity;
}

/** Chave: `userId` (ver `src/mocks/data/users.ts`). */
export const mockGoals: Record<string, GoalsEntity> = {
  "user-1": {
    daily: {
      description: "Conquiste 150 pontos estudando hoje",
      target: 150,
      progress: 90,
      unit: "pontos",
      completed: false,
    },
    weekly: {
      description: "Conquiste 500 pontos essa semana",
      target: 500,
      progress: 500,
      unit: "pontos",
      completed: true,
    },
  },
  "user-2": {
    daily: {
      description: "Conquiste 150 pontos estudando hoje",
      target: 150,
      progress: 150,
      unit: "pontos",
      completed: true,
    },
    weekly: {
      description: "Conquiste 500 pontos essa semana",
      target: 500,
      progress: 500,
      unit: "pontos",
      completed: true,
    },
  },
  "user-3": {
    daily: {
      description: "Conquiste 150 pontos estudando hoje",
      target: 150,
      progress: 20,
      unit: "pontos",
      completed: false,
    },
    weekly: {
      description: "Conquiste 500 pontos essa semana",
      target: 500,
      progress: 140,
      unit: "pontos",
      completed: false,
    },
  },
  "user-4": {
    daily: {
      description: "Conquiste 150 pontos estudando hoje",
      target: 150,
      progress: 150,
      unit: "pontos",
      completed: true,
    },
    weekly: {
      description: "Conquiste 500 pontos essa semana",
      target: 500,
      progress: 500,
      unit: "pontos",
      completed: true,
    },
  },
};
