import { z } from "zod";

/**
 * Contratos de leitura do ranking (Fase 9 — agente `gamification`, CLAUDE.md §17).
 *
 * `getRankingInputSchema` é a ÚNICA entrada aceita do cliente — nunca `userId` (a posição do
 * usuário autenticado é sempre resolvida no servidor a partir da sessão, ADR-0006).
 */
export const rankingPeriodTypeSchema = z.enum(["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"]);
export type RankingPeriodTypeInput = z.infer<typeof rankingPeriodTypeSchema>;

export const rankingScopeTypeSchema = z.enum(["GLOBAL", "CONTEST", "COURSE", "CITY", "STATE"]);
export type RankingScopeTypeInput = z.infer<typeof rankingScopeTypeSchema>;

export const getRankingInputSchema = z
  .object({
    periodType: rankingPeriodTypeSchema.default("ALL_TIME"),
    scopeType: rankingScopeTypeSchema.default("GLOBAL"),
    /** Ignorado quando `scopeType === "GLOBAL"`. Obrigatório nos demais escopos. */
    scopeKey: z.string().min(1).default("global"),
    page: z.coerce.number().int().min(1).default(1),
  })
  .superRefine((value, ctx) => {
    if (value.scopeType !== "GLOBAL" && value.scopeKey === "global") {
      ctx.addIssue({
        code: "custom",
        path: ["scopeKey"],
        message: "Informe o identificador do escopo (concurso/curso/cidade/estado).",
      });
    }
  });
export type GetRankingInputDTO = z.infer<typeof getRankingInputSchema>;

export const rankingLevelSchema = z.object({
  index: z.number().int().min(1),
  name: z.string().min(1),
});

export const rankingEntryDTOSchema = z.object({
  position: z.number().int().min(0),
  userId: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  level: rankingLevelSchema,
  contestName: z.string().nullable(),
  points: z.number().int().min(0),
  validHours: z.number().min(0).nullable(),
  lessonsCompleted: z.number().int().min(0).nullable(),
  accuracyPercent: z.number().min(0).max(100).nullable(),
  streakDays: z.number().int().min(0).nullable(),
  evolution: z.number().int(),
  isCurrentUser: z.boolean(),
});
export type RankingEntryDTO = z.infer<typeof rankingEntryDTOSchema>;

export const rankingReadResultSchema = z.object({
  periodType: rankingPeriodTypeSchema,
  periodKey: z.string().min(1),
  scopeType: rankingScopeTypeSchema,
  scopeKey: z.string().min(1),
  calculationVersion: z.number().int().min(1).nullable(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  top3: z.array(rankingEntryDTOSchema),
  items: z.array(rankingEntryDTOSchema),
  currentUser: rankingEntryDTOSchema.nullable(),
});
export type RankingReadResultDTO = z.infer<typeof rankingReadResultSchema>;
