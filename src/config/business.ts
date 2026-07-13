/**
 * Limiares de negócio configuráveis (ADR-0010).
 * Contém apenas VALORES DEFAULT — nenhuma lógica de cálculo/regra vive aqui.
 * A lógica definitiva pertence aos agentes de domínio (gamification, study-tracking,
 * simulations) nas fases seguintes.
 */

/** Percentual mínimo assistido do vídeo para considerar uma aula concluída (CLAUDE.md §12). */
export const LESSON_COMPLETION_MIN_PERCENT = 0.8;

/**
 * Parâmetros de heartbeat / tempo válido (Fase 7 — agente `study-tracking`, CLAUDE.md §13/§14).
 * Nenhum destes valores é lido do cliente — servem apenas para o servidor avaliar a
 * plausibilidade dos sinais brutos recebidos (`HeartbeatInput`, `src/contracts/progress.ts`).
 */
export const STUDY_TRACKING = {
  /** Acima disso, o intervalo real entre heartbeats é limitado (não descartado por completo) —
   *  cobre pausas longas, aba minimizada por muito tempo, dispositivo suspenso etc. */
  heartbeatMaxGapSeconds: 30,
  /** Cadência real esperada do player entre heartbeats, em segundos (referência p/ o cliente). */
  heartbeatIntervalSeconds: 10,
  /** Intervalo mínimo aceito entre heartbeats da MESMA sessão/aula (rate limit leve). Alinhado
   *  à cadência real (~10s) com folga p/ jitter de rede — NÃO substitui o cap por tempo real do
   *  `heartbeat-evaluator` (a barreira anti-fraude é lá); é só defesa em profundidade. */
  heartbeatMinClientIntervalMs: 5_000,
  /** Margem de tolerância sobre o avanço de posição plausível (variação de rede/buffer). */
  positionJumpToleranceFactor: 1.5,
  /** Tolerância mínima (segundos) antes de sinalizar um salto de posição como artificial. */
  positionJumpMinSeconds: 5,
  minPlausiblePlaybackRate: 0.25,
  maxPlausiblePlaybackRate: 2,
  /** Janela (segundos) para considerar duas sessões do mesmo usuário como simultâneas suspeitas. */
  concurrentSessionWindowSeconds: 20,
} as const;

/**
 * Pontuação mínima do consumidor de gamificação criado nesta fase (CLAUDE.md §15 — "aula
 * concluída: 100 pontos"). A fórmula completa (módulo/curso/flashcard/streak/níveis) é do
 * agente `gamification` na Fase 8 — este valor cobre só o evento `LessonCompleted`.
 */
export const LESSON_COMPLETION_POINTS = 100;
/** TODO(Fase 8 — gamification): XP pode divergir de pontos numa fórmula própria; por ora, igual. */
export const LESSON_COMPLETION_XP = 100;

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
