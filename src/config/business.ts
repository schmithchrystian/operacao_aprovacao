/**
 * Limiares de negócio configuráveis (ADR-0010).
 * Contém apenas VALORES DEFAULT — nenhuma lógica de cálculo/regra vive aqui.
 * A lógica definitiva pertence aos agentes de domínio (gamification, study-tracking,
 * simulations) nas fases seguintes.
 */

/** Percentual mínimo assistido do vídeo para considerar uma aula concluída (CLAUDE.md §12). */
export const LESSON_COMPLETION_MIN_PERCENT = 0.8;

/**
 * Pesos default da fórmula de ranking (CLAUDE.md §17). Devem somar 1 e ser normalizados
 * pelo serviço de gamification — este módulo só expõe os valores configuráveis.
 */
export const RANKING_WEIGHTS = {
  simuladoPerformance: 0.35,
  lessonsCompleted: 0.25,
  consistency: 0.2,
  validTime: 0.1,
  goalsCompleted: 0.1,
} as const;

export type RankingWeightKey = keyof typeof RANKING_WEIGHTS;
