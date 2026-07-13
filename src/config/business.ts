/**
 * Limiares de negócio configuráveis (ADR-0010).
 * Contém apenas VALORES DEFAULT — nenhuma lógica de cálculo/regra vive aqui.
 * A lógica definitiva pertence aos agentes de domínio (gamification, study-tracking,
 * simulations) nas fases seguintes.
 */

/** Percentual mínimo assistido do vídeo para considerar uma aula concluída (CLAUDE.md §12). */
export const LESSON_COMPLETION_MIN_PERCENT = 0.8;

/**
 * Rate limiting / lockout do login (CLAUDE.md §24 — "limitar requisições críticas").
 * Após `maxFailures` falhas dentro de `windowMs`, a chave (e-mail [+ IP]) fica bloqueada
 * por `lockoutMs`. Valores conservadores para o MVP; ajustar conforme telemetria real.
 */
export const LOGIN_RATE_LIMIT = {
  /** Nº de falhas na janela que dispara o bloqueio. */
  maxFailures: 5,
  /** Janela de contagem das falhas, em ms. */
  windowMs: 5 * 60_000,
  /** Duração do bloqueio após atingir `maxFailures`, em ms. */
  lockoutMs: 60_000,
} as const;

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
