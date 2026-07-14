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
 * Regras de recompensa da gamificação (Fase 8 — agente `gamification`, CLAUDE.md §15).
 * Chaves alinhadas 1:1 com o enum `GamificationEventType` do Prisma (`prisma/schema.prisma`).
 *
 * Política de XP: por ora, XP é igual a pontos para todo evento (`xp = points`). Decisão
 * deliberada e documentada (não um placeholder esquecido): mantém a curva de níveis
 * diretamente proporcional aos pontos conquistados, mais simples de auditar e comunicar ao
 * aluno. Uma fórmula que divirja (multiplicadores, decaimento por tempo, XP sem pontos ou
 * vice-versa) é uma mudança de regra de negócio — deve incrementar `GAMIFICATION_RULE_VERSION`
 * e nunca reescrever o histórico já gravado em `PointTransaction`/`GamificationEvent`.
 */
export const GAMIFICATION_REWARDS = {
  LESSON_COMPLETED: { points: 100, xp: 100 },
  MODULE_COMPLETED: { points: 500, xp: 500 },
  COURSE_COMPLETED: { points: 2000, xp: 2000 },
  FLASHCARD_CORRECT: { points: 5, xp: 5 },
  POMODORO_COMPLETED: { points: 50, xp: 50 },
  MOCK_EXAM_COMPLETED: { points: 300, xp: 300 },
  QUESTION_CORRECT: { points: 20, xp: 20 },
  DAILY_GOAL_COMPLETED: { points: 150, xp: 150 },
  WEEKLY_GOAL_COMPLETED: { points: 500, xp: 500 },
  STREAK_7: { points: 700, xp: 700 },
  STREAK_30: { points: 3000, xp: 3000 },
  /** Ajuste manual (correção/estorno) — nunca atribuído automaticamente por um handler. */
  MANUAL_ADJUSTMENT: { points: 0, xp: 0 },
} as const;

export type GamificationRewardEventType = keyof typeof GAMIFICATION_REWARDS;

/**
 * Versão vigente da tabela de regras acima. Gravada em todo `GamificationEvent` — permite
 * auditar/recalcular sem reescrever eventos antigos quando os valores mudarem (CLAUDE.md §15/§25).
 */
export const GAMIFICATION_RULE_VERSION = 1;

/**
 * Pontuação/XP de "aula concluída" (CLAUDE.md §15) — mantidos como aliases estáveis do valor
 * central acima porque `src/contracts/progress.ts`/`study-tracking` já os referenciam
 * nominalmente. Nunca duplicar o número: sempre derivar de `GAMIFICATION_REWARDS`.
 */
export const LESSON_COMPLETION_POINTS = GAMIFICATION_REWARDS.LESSON_COMPLETED.points;
export const LESSON_COMPLETION_XP = GAMIFICATION_REWARDS.LESSON_COMPLETED.xp;

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

/**
 * Versão vigente do cálculo de ranking (Fase 9 — agente `gamification`, CLAUDE.md §17,
 * ADR-0009). Gravada em toda `RankingScore` — incrementar sempre que a fórmula, os pesos ou
 * as fontes de métrica mudarem. NUNCA sobrescreve versões antigas (auditoria/rollback); o
 * cron de recálculo (`/api/cron/ranking-recalc`) grava a versão vigente a cada execução.
 */
export const RANKING_CALCULATION_VERSION = 1;

/** Tamanho de página da listagem de ranking (leitura — `ranking/read.ts`). */
export const RANKING_PAGE_SIZE = 20;

/** Quantidade de posições em destaque ("pódio") no topo do ranking. */
export const RANKING_TOP_HIGHLIGHT_COUNT = 3;

/**
 * Períodos e tarefas recalculadas pelo cron de ranking por padrão (sem escopo explícito na
 * requisição — ver `src/app/api/cron/ranking-recalc/route.ts`). `DAILY` fica de fora do
 * default (custo de recálculo maior, sem consumidor de UI ainda) — pode ser disparado à
 * parte informando `periodType` no corpo da requisição.
 */
export const RANKING_DEFAULT_RECALC_PERIOD_TYPES = ["WEEKLY", "MONTHLY", "ALL_TIME"] as const;
