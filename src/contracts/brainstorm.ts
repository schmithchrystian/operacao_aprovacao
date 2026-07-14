import { z } from "zod";
import { BRAINSTORM_LIMITS } from "@/config/business";
import { idSchema } from "./common";

/**
 * Contratos de "Brainstorm" (Fase 13 — agente `backend`, CLAUDE.md §20). Persistência real já
 * modelada pelo agente `database` (`BrainstormBoard`/`BrainstormColumn`/`BrainstormCard`,
 * docs/DATA-MODEL.md, "Brainstorm") — aqui só os DTOs/entradas consumidos por services
 * (`src/server/services/brainstorm`) e actions (`src/server/actions/brainstorm.ts`).
 *
 * `BrainstormCard.status` é independente da coluna atual (docs/DATA-MODEL.md): representa o
 * ciclo de vida do cartão (`OPEN`/`ARCHIVED`/`CONVERTED`), enquanto a coluna representa só a
 * posição no quadro. `resolvido` no DTO é DERIVADO (coluna atual === "Resolvido"), não é a
 * mesma coisa que `status`.
 */

/** Tipo do cartão (CLAUDE.md §20 não lista "tipo" explicitamente como campo do board/coluna, mas
 *  a Fase 13 pede: ideia | dúvida | resumo | anotação). Ver `BrainstormCardEntity.type` para a
 *  nota sobre esta ser uma divergência de aplicação (ainda sem coluna própria no Prisma). */
export const brainstormCardTypeSchema = z.enum(["IDEIA", "DUVIDA", "RESUMO", "ANOTACAO"]);
export type BrainstormCardType = z.infer<typeof brainstormCardTypeSchema>;

/** Espelha `BrainstormCardPriority` do Prisma. */
export const brainstormCardPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export type BrainstormCardPriority = z.infer<typeof brainstormCardPrioritySchema>;

/** Espelha `BrainstormCardStatus` do Prisma. */
export const brainstormCardStatusSchema = z.enum(["OPEN", "ARCHIVED", "CONVERTED"]);
export type BrainstormCardStatus = z.infer<typeof brainstormCardStatusSchema>;

export const brainstormCardDTOSchema = z.object({
  id: idSchema,
  columnId: idSchema,
  type: brainstormCardTypeSchema,
  title: z.string().min(1),
  content: z.string().nullable(),
  tags: z.array(z.string()),
  subjectId: idSchema.nullable(),
  subjectName: z.string().nullable(),
  topicId: idSchema.nullable(),
  topicName: z.string().nullable(),
  priority: brainstormCardPrioritySchema,
  status: brainstormCardStatusSchema,
  /** Derivado: `true` quando o cartão está atualmente na coluna "Resolvido" (ver
   *  `BRAINSTORM_RESOLVED_COLUMN_TITLE`, `@/config/business`) — não confundir com `status`. */
  resolvido: z.boolean(),
  /** Posição para drag-and-drop — única dentro da coluna. */
  order: z.number().int().min(0),
  /** Id do rascunho de flashcard gerado por `convertToFlashcard` (TODO Fase 14 — ver
   *  `@/server/services/brainstorm/flashcard-draft-store.ts`), ou `null`. */
  convertedFlashcardId: z.string().nullable(),
  /** Id do `StudyPlanItem` real criado por `convertToStudyTask`, ou `null`. */
  convertedStudyPlanItemId: idSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BrainstormCardDTO = z.infer<typeof brainstormCardDTOSchema>;

export const brainstormColumnDTOSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  order: z.number().int().min(0),
  cards: z.array(brainstormCardDTOSchema),
});
export type BrainstormColumnDTO = z.infer<typeof brainstormColumnDTOSchema>;

/** Quadro completo — colunas e cartões já ordenados (`getBoard`/`createBoard`). */
export const brainstormBoardDTOSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  columns: z.array(brainstormColumnDTOSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BrainstormBoardDTO = z.infer<typeof brainstormBoardDTOSchema>;

/** Resumo sem cartões — usado em `listBoards` (evita montar o quadro inteiro só para listar). */
export const brainstormBoardSummaryDTOSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  columnCount: z.number().int().min(0),
  cardCount: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BrainstormBoardSummaryDTO = z.infer<typeof brainstormBoardSummaryDTOSchema>;

// ---------------------------------------------------------------------------
// Entradas
// ---------------------------------------------------------------------------

/** Entrada de `createBoardAction` — sempre cria as 5 colunas padrão (CLAUDE.md §20). */
export const createBoardInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Informe um título.")
    .max(BRAINSTORM_LIMITS.boardTitleMaxLength, "Título muito longo."),
});
export type CreateBoardInput = z.infer<typeof createBoardInputSchema>;

/** Entrada de `getBoardAction`. */
export const boardIdInputSchema = z.object({
  boardId: idSchema,
});
export type BoardIdInput = z.infer<typeof boardIdInputSchema>;

const tagsSchema = z
  .array(z.string().trim().min(1).max(BRAINSTORM_LIMITS.tagMaxLength, "Tag muito longa."))
  .max(BRAINSTORM_LIMITS.maxTags, "Muitas tags.");

/** Entrada de `createCardAction`. `columnId` determina o quadro (resolvido/validado no serviço —
 *  nunca um `boardId` solto vindo do cliente). */
export const createCardInputSchema = z.object({
  columnId: idSchema,
  type: brainstormCardTypeSchema.default("IDEIA"),
  title: z
    .string()
    .trim()
    .min(1, "Informe um título.")
    .max(BRAINSTORM_LIMITS.cardTitleMaxLength, "Título muito longo."),
  content: z.string().max(BRAINSTORM_LIMITS.cardContentMaxLength, "Conteúdo muito longo.").optional(),
  tags: tagsSchema.default([]),
  subjectId: idSchema.optional(),
  topicId: idSchema.optional(),
  priority: brainstormCardPrioritySchema.default("MEDIUM"),
});
export type CreateCardInput = z.infer<typeof createCardInputSchema>;

/** Entrada de `updateCardAction` — todos os campos opcionais (exceto `cardId`); `content`/
 *  `subjectId`/`topicId` aceitam `null` explícito para limpar o campo (distinto de omitido =
 *  não alterar, mesma convenção de `updatePlanItemInputSchema`, `@/contracts/study-plan`). */
export const updateCardInputSchema = z
  .object({
    cardId: idSchema,
    type: brainstormCardTypeSchema.optional(),
    title: z
      .string()
      .trim()
      .min(1, "Informe um título.")
      .max(BRAINSTORM_LIMITS.cardTitleMaxLength, "Título muito longo.")
      .optional(),
    content: z.string().max(BRAINSTORM_LIMITS.cardContentMaxLength, "Conteúdo muito longo.").nullable().optional(),
    tags: tagsSchema.optional(),
    subjectId: idSchema.nullable().optional(),
    topicId: idSchema.nullable().optional(),
    priority: brainstormCardPrioritySchema.optional(),
  })
  .refine(
    (value) =>
      value.type !== undefined ||
      value.title !== undefined ||
      value.content !== undefined ||
      value.tags !== undefined ||
      value.subjectId !== undefined ||
      value.topicId !== undefined ||
      value.priority !== undefined,
    { message: "Informe ao menos um campo para atualizar." },
  );
export type UpdateCardInput = z.infer<typeof updateCardInputSchema>;

/** Entrada de `deleteCardAction`/`markResolvedAction`/`convertToFlashcardAction`/
 *  `convertToStudyTaskAction` — só o id do cartão (dono resolvido/validado no serviço). */
export const cardIdInputSchema = z.object({
  cardId: idSchema,
});
export type CardIdInput = z.infer<typeof cardIdInputSchema>;

/** Entrada de `moveCardAction` — drag-and-drop entre colunas (ou dentro da mesma coluna).
 *  `toIndex` é a posição final desejada dentro da coluna destino (0-based; fora do intervalo é
 *  ajustado/"clampado" no serviço, nunca rejeitado). */
export const moveCardInputSchema = z.object({
  cardId: idSchema,
  toColumnId: idSchema,
  toIndex: z.number().int().min(0),
});
export type MoveCardInput = z.infer<typeof moveCardInputSchema>;
