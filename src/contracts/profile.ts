import { z } from "zod";
import { idSchema } from "./common";

/**
 * Contratos de "Perfil" (Fase 16 — agente `backend`, CLAUDE.md §31 item 19,
 * docs/DATA-MODEL.md — `Profile`, 1:1 com `User`).
 *
 * REGRA DURA (CLAUDE.md §11/§24): as configurações de privacidade são aplicadas SEMPRE no
 * BACKEND (`src/server/services/profile`) — nunca confiar em esconder campo só na UI. Um único
 * `ProfileDTO` cobre as duas visões (o próprio dono E um visitante):
 * - `isOwnProfile === true` (o dono): todos os campos vêm preenchidos, incluindo `privacy`
 *   (as flags cruas, para alimentar a tela de configurações) e `phone`/`birthDate`.
 * - `isOwnProfile === false` (visitante): `privacy` é sempre `null` (o visitante nunca vê as
 *   flags exatas de outro usuário, só o EFEITO delas); `phone`/`birthDate` são SEMPRE `null`
 *   (nenhuma flag os expõe — os dois campos mais sensíveis do Profile, mascarados
 *   incondicionalmente, de propósito mais estrito que o pedido original). Quando
 *   `isPublic === false`, o serviço devolve o DTO inteiro neutralizado (equivalente a
 *   "este perfil é privado") — ver `getPublicProfile`.
 *
 * Mapeamento das flags de privacidade → campos mascarados (as 4 primeiras existem como coluna
 * própria no Prisma; as 2 últimas são CAMPOS DE APLICAÇÃO — ver
 * `@/server/repositories/contracts/profile-repository`):
 * - `isProfilePublic`: interruptor mestre — quando falso, fecha o perfil inteiro para quem não
 *   é o dono (nenhum outro campo abaixo importa nesse caso).
 * - `showRealName` → `name` (senão, nome anonimizado — mesma convenção de
 *   `anonymizedRankingName`, `@/server/services/gamification/ranking`).
 * - `showCityState` → `city` + `state` juntos (mesmo par usado no ranking).
 * - `showStudyHours` → `aggregates.studyHours` + `aggregates.lessonsCompleted` +
 *   `aggregates.mockExamsCompleted` + `aggregates.streakDays` (métricas de ATIVIDADE/esforço —
 *   `streakDays` é a sequência de dias estudando, esforço como as horas, então segue a mesma
 *   flag; revisão de segurança Fase 16, achado B2).
 * - `showPerformance` → `aggregates.averageMockExamScorePercent` (DESEMPENHO).
 * - `showInRanking` → `aggregates.rankingPosition` + `aggregates.rankingTotalParticipants`
 *   (participação no ranking; já era a fonte da Fase 9 — `ranking/read.ts` usa a MESMA flag).
 *
 * Campos sem flag dedicada (`avatarUrl`, `bio`, `mainContest`, `interestedContests`,
 * `examDate`, `level`/`points`/`xp`/conquistas/sequência) são exibidos sempre que o perfil
 * estiver público (`isProfilePublic`) — mesma postura já adotada pelo ranking para
 * `avatarUrl`/`contestName` (nunca mascarados por `showRealName`/`showCityState`).
 */

// ---------------------------------------------------------------------------
// Privacidade
// ---------------------------------------------------------------------------

export const privacySettingsDTOSchema = z.object({
  isProfilePublic: z.boolean(),
  showRealName: z.boolean(),
  showCityState: z.boolean(),
  showStudyHours: z.boolean(),
  showPerformance: z.boolean(),
  showInRanking: z.boolean(),
});
export type PrivacySettingsDTO = z.infer<typeof privacySettingsDTOSchema>;

export const updatePrivacySettingsInputSchema = privacySettingsDTOSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos uma preferência de privacidade para atualizar.",
  });
export type UpdatePrivacySettingsInput = z.infer<typeof updatePrivacySettingsInputSchema>;

// ---------------------------------------------------------------------------
// Agregados (leitura — nunca recomputados aqui, só o formato de saída)
// ---------------------------------------------------------------------------

export const profileAchievementSummaryDTOSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  /** ISO 8601. */
  unlockedAt: z.string().min(1),
});
export type ProfileAchievementSummaryDTO = z.infer<typeof profileAchievementSummaryDTOSchema>;

export const profileAggregatesDTOSchema = z.object({
  level: z.object({ index: z.number().int().min(1), name: z.string().min(1) }),
  points: z.number().int().min(0),
  xp: z.number().int().min(0),
  /** `null`: sem `RankingScore` calculado ainda PARA O ESCOPO ALL_TIME/GLOBAL, ou
   *  `showInRanking` desligado para um visitante que não é o dono. */
  rankingPosition: z.number().int().min(1).nullable(),
  rankingTotalParticipants: z.number().int().min(0).nullable(),
  /** Horas de estudo válido acumuladas (nunca `fim - início` bruto — CLAUDE.md §14). `null`
   *  quando `showStudyHours` está desligado para um visitante que não é o dono. */
  studyHours: z.number().min(0).nullable(),
  lessonsCompleted: z.number().int().min(0).nullable(),
  mockExamsCompleted: z.number().int().min(0).nullable(),
  /** Média (0-100) de `scorePercent` entre os simulados finalizados. `null` quando
   *  `showPerformance` está desligado para um visitante, OU quando não há simulado finalizado. */
  averageMockExamScorePercent: z.number().min(0).max(100).nullable(),
  /** Sequência (dias) — métrica de esforço; `null` quando `showStudyHours` está desligado para
   *  um visitante (mesma flag das horas/aulas; revisão de segurança Fase 16, achado B2). */
  streakDays: z.number().int().min(0).nullable(),
  achievementsUnlockedCount: z.number().int().min(0),
  achievementsTotalCount: z.number().int().min(0),
  /** Últimas conquistas desbloqueadas (mais recente primeiro) — mesmo recorte de
   *  `DashboardDTO.recentAchievements` (`@/server/services/dashboard-service`). */
  recentAchievements: z.array(profileAchievementSummaryDTOSchema),
});
export type ProfileAggregatesDTO = z.infer<typeof profileAggregatesDTOSchema>;

export const profileContestSummaryDTOSchema = z.object({
  contestId: z.string().min(1),
  contestName: z.string().min(1),
});
export type ProfileContestSummaryDTO = z.infer<typeof profileContestSummaryDTOSchema>;

// ---------------------------------------------------------------------------
// Perfil (leitura)
// ---------------------------------------------------------------------------

export const profileDTOSchema = z.object({
  userId: idSchema,
  /** `true` quando quem pediu o perfil é o próprio dono autenticado. */
  isOwnProfile: z.boolean(),
  /** Espelha `Profile.isProfilePublic`. Quando `false` e `!isOwnProfile`, o restante do DTO
   *  vem neutralizado pelo serviço (fail-closed) — o frontend NUNCA decide isto sozinho. */
  isPublic: z.boolean(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  /** SEMPRE `null` quando `!isOwnProfile` (sem flag que exponha isto a terceiros). */
  phone: z.string().nullable(),
  /** ISO 8601. SEMPRE `null` quando `!isOwnProfile`. */
  birthDate: z.string().nullable(),
  mainContest: profileContestSummaryDTOSchema.nullable(),
  interestedContests: z.array(profileContestSummaryDTOSchema),
  /** ISO 8601 (meia-noite UTC) — mesma convenção de `StudyPlanDTO.examDate`; deriva do plano de
   *  estudos ATIVO do usuário (`StudyPlan.endDate`), nunca duplicado como campo próprio. */
  examDate: z.string().nullable(),
  /** `null` quando o perfil está fechado para quem pediu (visitante, `isPublic === false`). */
  aggregates: profileAggregatesDTOSchema.nullable(),
  /** Só populado quando `isOwnProfile === true` (o dono vendo as próprias preferências). */
  privacy: privacySettingsDTOSchema.nullable(),
});
export type ProfileDTO = z.infer<typeof profileDTOSchema>;

// ---------------------------------------------------------------------------
// Entradas
// ---------------------------------------------------------------------------

/** URL "segura" o suficiente para um `<img src>` — bloqueia esquemas executáveis
 *  (`javascript:`/`data:`/`vbscript:`) como defesa em profundidade contra XSS armazenado via
 *  avatar (CLAUDE.md §24). Não exige `https://`: aceita caminhos relativos (`/avatars/x.png`). */
const safeImageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => !/^\s*(javascript|data|vbscript):/i.test(value), {
    message: "URL de avatar inválida.",
  });

/**
 * As 27 unidades federativas do Brasil (26 estados + DF) — lista canônica para validar `state`
 * no SERVIDOR (revisão de segurança Fase 16, achado B1: antes só `/^[A-Z]{2}$/`, aceitava
 * qualquer par de letras como "XX"). O `<select>` do frontend
 * (`src/components/profile/br-states.ts`) oferece exatamente estas UFs com rótulo; aqui só o
 * código de 2 letras importa. Duplicação deliberada por camada (contracts não pode importar de
 * `components`) — a lista é constitucionalmente fixa, risco de divergência ~nulo.
 */
export const BR_UF_CODES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const BR_UF_SET: ReadonlySet<string> = new Set(BR_UF_CODES);

const ufSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => BR_UF_SET.has(value), { message: "UF inválida." });

/**
 * Entrada de `updateProfileAction`. `userId` nunca faz parte deste contrato — sempre resolvido
 * da sessão (ADR-0006). Campos `undefined` (omitidos) preservam o valor atual; `null` explícito
 * limpa o campo (mesmo padrão de `updateCardInputSchema`, `@/contracts/brainstorm`).
 */
export const updateProfileInputSchema = z
  .object({
    bio: z.string().trim().max(500).nullable().optional(),
    avatarUrl: safeImageUrlSchema.nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    /** ISO 8601. Deve estar no passado (defesa simples contra entrada absurda). */
    birthDate: z
      .string()
      .trim()
      .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Data de nascimento inválida." })
      .refine((value) => Date.parse(value) <= Date.now(), { message: "Data de nascimento não pode ser no futuro." })
      .nullable()
      .optional(),
    city: z.string().trim().min(1).max(120).nullable().optional(),
    state: ufSchema.nullable().optional(),
    /** Concurso principal — validado no serviço (deve existir em algum curso real). */
    targetContestId: idSchema.nullable().optional(),
  })
  .refine(
    (value) =>
      value.bio !== undefined ||
      value.avatarUrl !== undefined ||
      value.phone !== undefined ||
      value.birthDate !== undefined ||
      value.city !== undefined ||
      value.state !== undefined ||
      value.targetContestId !== undefined,
    { message: "Informe ao menos um campo para atualizar." },
  );
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

/**
 * Entrada de `getPublicProfileAction` — o id do alvo (o visitante vem sempre da sessão).
 *
 * `previewAsVisitor` (revisão de segurança Fase 16, achado M1): quando o dono consulta o
 * PRÓPRIO perfil com este flag ligado, o serviço aplica a MESMA máscara de visitante em vez de
 * devolver a visão completa — é a prévia "ver como outros veem". Só afeta o caso em que
 * `targetUserId` é o próprio usuário da sessão; para o perfil de OUTRO usuário é um no-op (a
 * máscara de visitante já se aplica), logo não pode ser abusado para ver dado de terceiro
 * mascarado-a-menos.
 */
export const getPublicProfileInputSchema = z.object({
  targetUserId: idSchema,
  previewAsVisitor: z.boolean().optional().default(false),
});
export type GetPublicProfileInput = z.infer<typeof getPublicProfileInputSchema>;
