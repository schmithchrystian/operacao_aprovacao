import { z } from "zod";
import { idSchema } from "./common";

/**
 * Contratos de "Montar estudo" (Fase 11 — agente `study-tracking`, CLAUDE.md §31 item 13).
 *
 * Gera uma sessão de estudo sob medida a partir do tempo disponível informado pelo aluno +
 * preferências de conteúdo/filtro. A ALOCAÇÃO de minutos por bloco é inteiramente um cálculo
 * do SERVIDOR (`src/server/services/study-plan/session-generator.ts`, puro e determinístico)
 * — o cliente só informa `availableMinutes` + preferências; nunca envia minutos por bloco.
 *
 * `contentTypeSchema` espelha `StudySessionContentType`
 * (`@/config/business.ts#STUDY_SESSION_BLOCK_WEIGHTS`) — manter as duas listas sincronizadas
 * (mesmo padrão de `questionDifficultySchema` espelhando `Difficulty` do Prisma).
 */
export const contentTypeSchema = z.enum([
  "videoaula",
  "pdf",
  "questoes",
  "flashcards",
  "revisao",
  "simulado",
  "resumo",
  "mapa_mental",
]);
export type ContentType = z.infer<typeof contentTypeSchema>;

/** Espelha `Difficulty` do Prisma (mesmo enum de `@/contracts/simulations#questionDifficultySchema`). */
export const sessionDifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export type SessionDifficulty = z.infer<typeof sessionDifficultySchema>;

/**
 * Entrada de `buildSessionAction`/`startStudyMissionAction`. Todos os filtros de conteúdo são
 * OPCIONAIS — o gerador cai para um bloco genérico quando não há conteúdo real correspondente
 * nos mocks (ver `src/server/services/study-plan/content-resolver.ts`).
 *
 * `teacherId` é aceito por completude do filtro pedido ("professor"), mas ainda NÃO é cruzado
 * contra nenhum dado real nesta fase — não existe um `TeacherRepository` no projeto (mesma
 * classe de lacuna já documentada em `services/study-tracking/lesson-view.ts` sobre
 * `LessonMaterial`); aceito e validado, porém ignorado na resolução de conteúdo (pendência
 * registrada no relatório da Fase 11).
 */
export const buildSessionInputSchema = z.object({
  contestId: idSchema.optional(),
  courseId: idSchema.optional(),
  subjectId: idSchema.optional(),
  topicId: idSchema.optional(),
  teacherId: idSchema.optional(),
  difficulty: sessionDifficultySchema.optional(),
  contentTypes: z
    .array(contentTypeSchema)
    .min(1, "Selecione ao menos um tipo de conteúdo.")
    .max(8, "Tipos de conteúdo duplicados ou inválidos."),
  /** Minutos. Alocado entre os `contentTypes` escolhidos — nunca informado por tipo. */
  availableMinutes: z.coerce
    .number()
    .int()
    .min(5, "Informe ao menos 5 minutos.")
    .max(480, "Máximo de 8 horas (480 minutos) por sessão."),
});
export type BuildSessionInput = z.infer<typeof buildSessionInputSchema>;

export const sessionContentRefKindSchema = z.enum(["lesson", "mock_exam", "question_set", "generic"]);
export type SessionContentRefKind = z.infer<typeof sessionContentRefKindSchema>;

/**
 * Referência ao conteúdo real por trás de um bloco, quando o gerador encontra algo
 * correspondente nos mocks — `null` quando o bloco é genérico (nenhum conteúdo real
 * localizado para o filtro informado, ex.: flashcards/PDF/resumo/mapa mental, cujos
 * repositórios ainda não existem nesta fase).
 */
export const sessionContentRefDTOSchema = z.object({
  kind: sessionContentRefKindSchema,
  id: z.string().min(1).nullable(),
  title: z.string().min(1),
  href: z.string().min(1).nullable(),
});
export type SessionContentRefDTO = z.infer<typeof sessionContentRefDTOSchema>;

export const generatedSessionBlockDTOSchema = z.object({
  type: contentTypeSchema,
  /** Rótulo de exibição do tipo (`@/config/business.ts#STUDY_SESSION_BLOCK_LABELS`) — evita o
   *  frontend duplicar a tabela de tradução do enum. */
  label: z.string().min(1),
  title: z.string().min(1),
  minutes: z.number().int().min(0),
  contentRef: sessionContentRefDTOSchema.nullable(),
});
export type GeneratedSessionBlockDTO = z.infer<typeof generatedSessionBlockDTOSchema>;

/**
 * Sessão gerada — SEMPRE soma `minutes` de todos os `blocks` igual a `totalMinutes`
 * (invariante garantida pelo alocador puro, `session-generator.ts#allocateSessionMinutes`,
 * mesmo com arredondamento). Os campos de filtro são ecoados de volta só para a UI exibir o
 * contexto usado na geração (nunca recalculados a partir deles no cliente).
 */
export const generatedSessionDTOSchema = z.object({
  totalMinutes: z.number().int().min(0),
  blocks: z.array(generatedSessionBlockDTOSchema),
  contestId: idSchema.nullable(),
  courseId: idSchema.nullable(),
  subjectId: idSchema.nullable(),
  topicId: idSchema.nullable(),
});
export type GeneratedSessionDTO = z.infer<typeof generatedSessionDTOSchema>;

/** Espelha `StudySessionStatus` do Prisma (reaproveitado para a missão — ver
 *  `@/server/repositories/contracts/study-mission-repository`). */
export const studyMissionStatusSchema = z.enum(["ACTIVE", "FINISHED", "DISCARDED"]);
export type StudyMissionStatus = z.infer<typeof studyMissionStatusSchema>;

export const studyMissionDTOSchema = z.object({
  id: idSchema,
  status: studyMissionStatusSchema,
  startedAt: z.string().min(1),
  totalMinutes: z.number().int().min(0),
  blocks: z.array(generatedSessionBlockDTOSchema),
  /** Índice (0-based) do bloco atual dentro de `blocks`. */
  currentBlockIndex: z.number().int().min(0),
});
export type StudyMissionDTO = z.infer<typeof studyMissionDTOSchema>;

/**
 * Resultado de `startStudyMissionAction` — a missão persistida + o bloco inicial já resolvido
 * como conveniência (Fase 11: "retorna o ponto de partida (1º bloco)"), evitando o cliente
 * reimplementar `blocks[0]`/tratar uma missão sem blocos.
 */
export const startStudyMissionResultDTOSchema = z.object({
  mission: studyMissionDTOSchema,
  startingBlock: generatedSessionBlockDTOSchema,
});
export type StartStudyMissionResultDTO = z.infer<typeof startStudyMissionResultDTOSchema>;
