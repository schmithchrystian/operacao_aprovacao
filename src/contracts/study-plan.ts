import { z } from "zod";
import { idSchema } from "./common";

/**
 * Contratos de "Plano de estudos" (Fase 11 — agente `study-tracking`, CLAUDE.md §31 item 13).
 * Persistência real já modelada pelo agente `database` (`StudyPlan`/`StudyPlanItem`,
 * docs/DATA-MODEL.md, "Acompanhamento de estudos") — aqui só os DTOs/entradas consumidos por
 * services (`src/server/services/study-plan`) e actions (`src/server/actions/study-plan.ts`).
 *
 * Datas de calendário (`startDate`/`examDate`/`targetDate`) são ISO 8601 à meia-noite UTC
 * (`yyyy-mm-ddT00:00:00.000Z`) — mesma convenção de string ISO usada em todo o projeto para
 * datas, nunca `yyyy-mm-dd` puro. Fuso horário do aluno (CLAUDE.md — "timezone do usuário")
 * não é resolvido nesta fase (mesmo escopo de metas/sequência, fora do pedido da Fase 11) —
 * pendência registrada no relatório.
 */

/**
 * `kind` do item é um campo de APLICAÇÃO — ainda sem coluna própria no schema Prisma (ver
 * `StudyPlanItemEntity` em `@/server/repositories/contracts/study-plan-item-repository`, que
 * documenta a divergência). Distingue um bloco de estudo comum, uma revisão e um simulado
 * dentro do mesmo calendário sem exigir uma migration nesta fase.
 */
export const studyPlanItemKindSchema = z.enum(["STUDY", "REVIEW", "MOCK_EXAM", "CUSTOM"]);
export type StudyPlanItemKind = z.infer<typeof studyPlanItemKindSchema>;

/** Espelha `StudyPlanItemStatus` do Prisma. */
export const studyPlanItemStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "DONE", "SKIPPED"]);
export type StudyPlanItemStatus = z.infer<typeof studyPlanItemStatusSchema>;

/** Espelha `StudyPlanStatus` do Prisma. */
export const studyPlanStatusSchema = z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]);
export type StudyPlanStatus = z.infer<typeof studyPlanStatusSchema>;

export const studyPlanItemDTOSchema = z.object({
  id: idSchema,
  kind: studyPlanItemKindSchema,
  subjectId: idSchema.nullable(),
  subjectName: z.string().nullable(),
  topicId: idSchema.nullable(),
  topicName: z.string().nullable(),
  lessonId: idSchema.nullable(),
  lessonTitle: z.string().nullable(),
  title: z.string().min(1),
  /** ISO 8601 (meia-noite UTC), `null` para itens sem data definida. */
  targetDate: z.string().nullable(),
  estimatedMinutes: z.number().int().min(0).nullable(),
  /** Posição para drag-and-drop — única dentro do plano; ver `reorderPlanItemsAction`. */
  order: z.number().int().min(0),
  status: studyPlanItemStatusSchema,
  completedAt: z.string().nullable(),
});
export type StudyPlanItemDTO = z.infer<typeof studyPlanItemDTOSchema>;

export const studyPlanDayDTOSchema = z.object({
  /** ISO 8601 (meia-noite UTC) do dia. */
  date: z.string().min(1),
  items: z.array(studyPlanItemDTOSchema),
  totalMinutes: z.number().int().min(0),
});
export type StudyPlanDayDTO = z.infer<typeof studyPlanDayDTOSchema>;

export const studyPlanWeekDTOSchema = z.object({
  /** ISO 8601 (meia-noite UTC) do primeiro dia da semana do plano. */
  weekStart: z.string().min(1),
  days: z.array(studyPlanDayDTOSchema),
});
export type StudyPlanWeekDTO = z.infer<typeof studyPlanWeekDTOSchema>;

export const studyPlanMonthDTOSchema = z.object({
  /** `yyyy-mm`. */
  month: z.string().min(1),
  days: z.array(studyPlanDayDTOSchema),
});
export type StudyPlanMonthDTO = z.infer<typeof studyPlanMonthDTOSchema>;

export const subjectWeightDTOSchema = z.object({
  subjectId: idSchema,
  subjectName: z.string().min(1),
  /**
   * Peso EFETIVO/observado da matéria no plano atual — proporcional ao total de minutos
   * alocados a ela entre os itens `STUDY`/`REVIEW` (`getPlan`, `src/server/services/
   * study-plan/mappers.ts#computeSubjectWeights`). Não é necessariamente igual, número por
   * número, ao peso bruto informado em `generatePlanInputSchema.subjectWeights` — é o
   * resultado, já arredondado pela heurística de distribuição, e não um eco literal da
   * entrada (o schema `StudyPlan`/`StudyPlanItem` não tem coluna própria para guardar o peso
   * de configuração original).
   */
  weight: z.number().min(0),
});
export type SubjectWeightDTO = z.infer<typeof subjectWeightDTOSchema>;

export const studyPlanProgressDTOSchema = z.object({
  totalItems: z.number().int().min(0),
  doneItems: z.number().int().min(0),
  progressPercent: z.number().min(0).max(100),
  /** Itens com `targetDate` no passado e status ainda não terminal (`PENDING`/`IN_PROGRESS`). */
  overdueItems: z.number().int().min(0),
  /** Dias até `examDate`; `null` quando o plano não tem data de prova definida. */
  daysUntilExam: z.number().int().nullable(),
});
export type StudyPlanProgressDTO = z.infer<typeof studyPlanProgressDTOSchema>;

export const studyPlanDTOSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  status: studyPlanStatusSchema,
  /** ISO 8601 (meia-noite UTC). */
  startDate: z.string().min(1),
  /** Data da prova — mapeia `StudyPlan.endDate` no schema Prisma (renomeado no DTO para
   *  clareza; ver `StudyPlanEntity` no repositório). `null` quando ainda não definida. */
  examDate: z.string().nullable(),
  subjectWeights: z.array(subjectWeightDTOSchema),
  /** Todos os itens do plano, ordenados por `order` (mesma lista usada nas duas visões de
   *  calendário abaixo — `weeklyCalendar`/`monthlyCalendar` só reagrupam por data). */
  items: z.array(studyPlanItemDTOSchema),
  weeklyCalendar: z.array(studyPlanWeekDTOSchema),
  monthlyCalendar: z.array(studyPlanMonthDTOSchema),
  progress: studyPlanProgressDTOSchema,
});
export type StudyPlanDTO = z.infer<typeof studyPlanDTOSchema>;

// ---------------------------------------------------------------------------
// Entradas
// ---------------------------------------------------------------------------

export const subjectWeightInputSchema = z.object({
  subjectId: idSchema,
  /** Peso relativo (não precisa somar 1 entre as matérias — normalizado no serviço). */
  weight: z.number().min(0.1).max(10),
});
export type SubjectWeightInput = z.infer<typeof subjectWeightInputSchema>;

/**
 * Entrada de `generatePlanAction`. Regenera (substitui os itens de) o plano ATIVO do aluno
 * autenticado — nunca cria um segundo plano concorrente (ver
 * `src/server/services/study-plan/generate-plan.ts`). `userId` nunca faz parte deste
 * contrato — sempre resolvido da sessão (ADR-0006).
 */
export const generatePlanInputSchema = z
  .object({
    title: z.string().min(1).max(160).optional(),
    /** ISO 8601 (meia-noite UTC) — data da prova. */
    examDate: z.string().min(1, "Informe a data da prova."),
    /** ISO 8601 (meia-noite UTC); omitido = hoje, resolvido no SERVIDOR (nunca no cliente). */
    startDate: z.string().min(1).optional(),
    daysPerWeek: z.coerce.number().int().min(1).max(7).default(6),
    hoursPerDay: z.coerce.number().min(0.5).max(16).default(2),
    subjectWeights: z.array(subjectWeightInputSchema).min(1, "Informe ao menos uma matéria."),
    includeReviews: z.boolean().default(true),
    includeMockExams: z.boolean().default(true),
  })
  .refine((value) => !value.startDate || value.examDate > value.startDate, {
    message: "A data da prova deve ser depois da data de início.",
    path: ["examDate"],
  })
  .refine(
    (value) => {
      if (!value.startDate) return true;
      const days = (Date.parse(value.examDate) - Date.parse(value.startDate)) / 86_400_000;
      return days <= 730;
    },
    {
      // Limite defensivo (CLAUDE.md §24, "limitar requisições críticas"): sem isto, uma
      // `examDate` absurdamente distante geraria um nº de itens sem limite prático (um item
      // por dia do horizonte) — 730 dias (~2 anos) já cobre qualquer preparação realista.
      message: "A data da prova não pode ser mais de 2 anos após a data de início.",
      path: ["examDate"],
    },
  );
export type GeneratePlanInput = z.infer<typeof generatePlanInputSchema>;

export const updatePlanItemInputSchema = z
  .object({
    planId: idSchema,
    itemId: idSchema,
    status: studyPlanItemStatusSchema.optional(),
    targetDate: z.string().nullable().optional(),
    estimatedMinutes: z.number().int().min(0).nullable().optional(),
    title: z.string().min(1).max(200).optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.targetDate !== undefined ||
      value.estimatedMinutes !== undefined ||
      value.title !== undefined,
    { message: "Informe ao menos um campo para atualizar." },
  );
export type UpdatePlanItemInput = z.infer<typeof updatePlanItemInputSchema>;

/** Entrada de `reorderPlanItemsAction` — a lista COMPLETA de itens do plano, na ordem final
 *  desejada (suporte a drag-and-drop). Nunca incremental (evita ambiguidade de posição). */
export const reorderPlanItemsInputSchema = z.object({
  planId: idSchema,
  itemIds: z
    .array(idSchema)
    .min(1)
    // Um mesmo item não pode aparecer duas vezes: `[A,A,B]` daria uma ordem ambígua (qual
    // posição de A vale?) e mascararia um item omitido. Barrado já no contrato; reforçado no
    // serviço com a comparação contra o conjunto real do plano (`reorderPlanItems`).
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Há itens repetidos na ordenação.",
    }),
});
export type ReorderPlanItemsInput = z.infer<typeof reorderPlanItemsInputSchema>;
