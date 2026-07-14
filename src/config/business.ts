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
 * Parâmetros de simulados (Fase 10 — agente `simulations`, CLAUDE.md §18/§25).
 * Nenhum valor de tempo é lido do cliente: a tentativa registra `startedAt`/`timeLimitSeconds`
 * no servidor (`MockExamAttempt`, docs/DATA-MODEL.md) e a submissão mede o tempo decorrido
 * sempre a partir do relógio do servidor (`Date.now() - startedAt`), nunca de um valor
 * enviado pelo cliente (`SubmitAnswersInput` não possui nenhum campo de tempo).
 */
export const SIMULATIONS = {
  /** Tolerância (segundos) além do `timeLimitSeconds` configurado antes de expirar a tentativa
   *  — cobre latência de rede entre o fim do cronômetro no cliente e a chegada da submissão. */
  timeOverageToleranceSeconds: 30,
  /** Minutos por questão usados como duração padrão de um simulado personalizado (filtros/pool)
   *  quando o aluno não informa `timeLimitMinutes` explicitamente. */
  customExamMinutesPerQuestion: 3,
  /** Duração mínima (minutos) de um simulado personalizado, mesmo com poucas questões. */
  customExamMinDurationMinutes: 10,
  /** Rate limit LEVE (CLAUDE.md §24, "limitar requisições críticas"): intervalo mínimo entre
   *  criações de tentativa por usuário. Cada `createAttempt` grava um registro (e, no modo
   *  personalizado, um `MockExam` ad-hoc) — sem isto o endpoint seria "spammável". */
  createAttemptMinIntervalMs: 2_000,
  /** Rate limit LEVE: intervalo mínimo entre submissões/finalizações por usuário. */
  submitAttemptMinIntervalMs: 1_000,
} as const;

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

/**
 * Tipos de conteúdo de um bloco de sessão gerada (Fase 11 — agente `study-tracking`, "Montar
 * estudo"). Espelhado em `contentTypeSchema` (`@/contracts/study-session`) — manter as duas
 * listas sincronizadas (mesmo padrão de `questionDifficultySchema` espelhando `Difficulty`).
 */
export type StudySessionContentType =
  | "videoaula"
  | "pdf"
  | "questoes"
  | "flashcards"
  | "revisao"
  | "simulado"
  | "resumo"
  | "mapa_mental";

/**
 * Pesos RELATIVOS de cada tipo de conteúdo na alocação proporcional de uma sessão (Fase 11).
 * Não precisam somar 1: o gerador (`src/server/services/study-plan/session-generator.ts`)
 * sempre normaliza sobre o SUBCONJUNTO de tipos escolhido pelo aluno numa chamada — por isso
 * só a proporção ENTRE os pesos selecionados importa, nunca o valor absoluto isolado.
 *
 * Cenário de referência (usado em `tests/unit/study-session-generator.test.ts`): com os tipos
 * `videoaula/questoes/flashcards/revisao` (pesos 5/3/2/2) e 60 minutos disponíveis, a alocação
 * resultante é 25/15/10/10 — a proporção 5:3:2:2 aplicada a 60 minutos.
 */
export const STUDY_SESSION_BLOCK_WEIGHTS: Record<StudySessionContentType, number> = {
  videoaula: 5,
  questoes: 3,
  simulado: 4,
  flashcards: 2,
  revisao: 2,
  pdf: 2,
  resumo: 2,
  mapa_mental: 1,
};

/** Ordem de exibição/estudo coerente (aprender → praticar → reforçar) — independe da ordem em
 *  que o aluno selecionou os tipos no formulário; o gerador sempre reordena por esta lista. */
export const STUDY_SESSION_BLOCK_ORDER: readonly StudySessionContentType[] = [
  "videoaula",
  "pdf",
  "resumo",
  "mapa_mental",
  "questoes",
  "simulado",
  "flashcards",
  "revisao",
];

/** Rótulo exibido de cada tipo de conteúdo (usado no título default de um bloco genérico). */
export const STUDY_SESSION_BLOCK_LABELS: Record<StudySessionContentType, string> = {
  videoaula: "Videoaula",
  pdf: "PDF",
  questoes: "Questões",
  flashcards: "Flashcards",
  revisao: "Revisão",
  simulado: "Simulado",
  resumo: "Resumo",
  mapa_mental: "Mapa mental",
};

export const STUDY_SESSION = {
  /** Minutos mínimos para um bloco "fazer sentido" isoladamente. O alocador tenta garantir
   *  esse mínimo redistribuindo dos blocos maiores, mas só quando o tempo total disponível
   *  permite pelo menos `minBlockMinutes` para CADA tipo escolhido — caso contrário (poucos
   *  minutos para muitos tipos), mantém a alocação proporcional pura (pode incluir blocos
   *  menores que o mínimo, nunca negativos). */
  minBlockMinutes: 5,
} as const;

/**
 * Parâmetros de acompanhamento/sequência/metas (Fase 12 — agente `study-tracking`, CLAUDE.md
 * §14/§31 item "acompanhamento"). Heurística determinística: `now`/timezone são sempre entrada
 * explícita dos serviços (`src/server/services/study-tracking/{streak,goals,diagnosis}.ts`),
 * nunca lidos direto por uma função pura.
 */
export const STUDY_TRACKING_OVERVIEW = {
  /**
   * Timezone default para resolver "dia civil" a partir de um instante (heartbeat/transação) —
   * `Intl.DateTimeFormat` com IANA timezone (`@/server/services/study-tracking/activity-days`).
   * TODO(pendência explícita — sem fonte no schema atual): `Profile` (docs/DATA-MODEL.md) não
   * tem coluna de timezone do usuário; usar sempre UTC até essa fonte existir.
   */
  defaultTimezone: "UTC",
  /** Marcos de sequência com recompensa própria (CLAUDE.md §15) — `STREAK_7`/`STREAK_30` em
   *  `GAMIFICATION_REWARDS`. Cruzar cada marco pela primeira vez emite `StreakReached` uma
   *  única vez por usuário (idempotencyKey sem data — nunca reconcede o mesmo marco). */
  streakMilestones: [7, 30] as const,
  // Tolerância de sequência ("freeze"): `computeStreak` (`@/server/services/study-tracking/
  // activity-days`) perdoa cada dia perdido CONSUMINDO 1 de `UserStreak.freezesAvailable` — a
  // sequência só quebra ao encontrar um dia perdido sem freeze restante (com N freezes é
  // possível atravessar até N dias perdidos, contíguos ou não). Não há parâmetro de config aqui:
  // o único "botão" é `freezesAvailable` por usuário (persistido em `UserStreak`), e a mecânica
  // de CONCESSÃO de freezes (quando/como o aluno ganha um) não é especificada em CLAUDE.md —
  // decisão/pendência documentada em `UserStreakEntity.freezesAvailable`
  // (`@/server/repositories/contracts/user-streak-repository`).
  /** Alvo default da meta diária (pontos) — mesmo valor já exibido no mock legado
   *  (`src/mocks/data/dashboard-goals.ts`), agora usado como default REAL configurável. */
  dailyGoalTargetPoints: 150,
  /** Alvo default da meta semanal (pontos). */
  weeklyGoalTargetPoints: 500,
  /** Percentual mínimo de acerto (0–100) abaixo do qual uma matéria/assunto é considerado
   *  "ponto fraco" — mesmo limiar já usado em `buildSuggestions`
   *  (`@/server/services/simulations/mappers.ts`), reaproveitado aqui para coerência. */
  weakSubjectAccuracyThreshold: 60,
  /** Nº mínimo de questões respondidas numa matéria/assunto para considerá-la no diagnóstico —
   *  evita classificar como "forte"/"fraco" a partir de uma amostra estatisticamente irrelevante. */
  minSampleForPerformance: 3,
  /** Janela (dias) usada para o indicador de "consistência" do acompanhamento. */
  consistencyWindowDays: 30,
  /** Dias até a prova abaixo dos quais o risco de atraso começa a ser avaliado com mais rigor. */
  examRiskHorizonDays: 30,
  /**
   * Limiares do diagnóstico de preparação (`@/server/services/study-tracking/diagnosis.ts`),
   * aplicados sobre `planProgressPercent - expectedProgressPercent` (progresso real menos o
   * esperado pelo tempo decorrido — negativo = atrasado):
   * - `progressGapHighRiskPercent`: gap igual ou mais negativo que isto → risco ALTO.
   * - `progressGapMediumRiskPercent`: gap igual ou mais negativo que isto (mas acima do limiar
   *   ALTO) → risco MÉDIO.
   */
  progressGapHighRiskPercent: -15,
  progressGapMediumRiskPercent: -5,
  /** Consistência (%) abaixo disto, isoladamente, já eleva o risco de atraso para MÉDIO. */
  lowConsistencyRiskPercent: 40,
} as const;

/**
 * Parâmetros do gerador de "Plano de estudos" (Fase 11). Heurística determinística: nunca lê
 * `Date.now()`/`Math.random()` internamente — `startDate`/`examDate`/`now` são sempre entrada
 * explícita do serviço (`src/server/services/study-plan/generate-plan.ts`), nunca lidos direto
 * pela função pura (`plan-generator.ts`).
 */
export const STUDY_PLAN = {
  /** A partir deste nº de horas/dia, o dia é dividido em 2 blocos de matérias distintas (mais
   *  variedade); abaixo disso, um único bloco ocupa o dia inteiro. */
  minHoursForTwoSubjectsPerDay: 2,
  /** Duração padrão (minutos) de um item de revisão gerado automaticamente num dia de folga. */
  defaultReviewMinutes: 45,
  /** Duração padrão (minutos) do simulado semanal gerado automaticamente. */
  defaultWeeklyMockExamMinutes: 90,
  /** Título default do plano quando o aluno não informa um título próprio. */
  defaultPlanTitle: "Plano de estudos",
} as const;
