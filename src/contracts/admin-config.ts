import { z } from "zod";

/**
 * Contratos de configuração administrativa (Fase 17 — agente `backend`). Expõe um subconjunto
 * OVERRIDABLE em runtime dos valores hoje fixos em `@/config/business.ts` (ADR-0010) — pontuação
 * (`GAMIFICATION_REWARDS`), pesos de ranking (`RANKING_WEIGHTS`) e percentual mínimo de conclusão
 * de aula (`LESSON_COMPLETION_MIN_PERCENT`). Só `admin` (CLAUDE.md/Fase 17: "Configuração... Só
 * admin").
 *
 * PENDÊNCIA IMPORTANTE: o override gravado aqui (`server/services/admin/config-store.ts`) NÃO
 * está, nesta fase, conectado aos motores reais (`@/server/services/gamification/engine.ts`,
 * `.../ranking/formula.ts`, `@/server/services/study-tracking`) — eles continuam lendo os
 * defaults ESTÁTICOS de `@/config/business.ts` diretamente. Conectar essa leitura ao override é
 * uma mudança de REGRA DE PONTUAÇÃO/RANKING e exige o agente `gamification` (CLAUDE.md: "Não
 * defina pontuação [nem ranking] sem participação do agente gamification") — fora do escopo do
 * `backend`/Fase 17. Esta tela/serviço existe para o admin CONSULTAR/AJUSTAR o valor que
 * *deveria* valer e para persistir a intenção — a aplicação real do valor é a próxima etapa,
 * feita em conjunto com esse agente. Persistência real (além de memória de processo) também é
 * pendência de banco (mesmo padrão de `auditLog`, `@/server/audit/log.ts`).
 */

export const gamificationRewardValueSchema = z.object({
  points: z.number().int().min(0).max(1_000_000),
  xp: z.number().int().min(0).max(1_000_000),
});
export type GamificationRewardValueInput = z.infer<typeof gamificationRewardValueSchema>;

/** Espelha `GamificationRewardEventType`/`GAMIFICATION_REWARDS` (`@/config/business.ts`) sem
 *  importar o módulo de config em `contracts/` (camada de contratos não deve depender de
 *  `config/`, ADR-0010) — as CHAVES são duplicadas aqui de propósito; mantê-las sincronizadas
 *  manualmente caso `config/business.ts` ganhe/remova um tipo de evento. */
const gamificationRewardsShape = {
  LESSON_COMPLETED: gamificationRewardValueSchema,
  MODULE_COMPLETED: gamificationRewardValueSchema,
  COURSE_COMPLETED: gamificationRewardValueSchema,
  FLASHCARD_CORRECT: gamificationRewardValueSchema,
  POMODORO_COMPLETED: gamificationRewardValueSchema,
  MOCK_EXAM_COMPLETED: gamificationRewardValueSchema,
  QUESTION_CORRECT: gamificationRewardValueSchema,
  DAILY_GOAL_COMPLETED: gamificationRewardValueSchema,
  WEEKLY_GOAL_COMPLETED: gamificationRewardValueSchema,
  STREAK_7: gamificationRewardValueSchema,
  STREAK_30: gamificationRewardValueSchema,
  MANUAL_ADJUSTMENT: gamificationRewardValueSchema,
};

/** Config completa (todas as chaves obrigatórias) — usada no DTO de leitura (sempre a
 *  config EFETIVA, nunca parcial). */
export const gamificationRewardsSchema = z.object(gamificationRewardsShape);
export type GamificationRewardsInput = z.infer<typeof gamificationRewardsSchema>;

/** PATCH parcial — usado na entrada de `updateBusinessConfigAction` (só as chaves que o admin
 *  quer sobrescrever). */
export const gamificationRewardsPartialSchema = z.object(gamificationRewardsShape).partial();
export type GamificationRewardsPartialInput = z.infer<typeof gamificationRewardsPartialSchema>;

/** Espelha `RANKING_WEIGHTS` (`@/config/business.ts`) — mesma observação de sincronização
 *  manual acima. */
const rankingWeightsShape = {
  simuladoPerformance: z.number().min(0).max(1),
  lessonsCompleted: z.number().min(0).max(1),
  consistency: z.number().min(0).max(1),
  validTime: z.number().min(0).max(1),
  goalsCompleted: z.number().min(0).max(1),
};

export const rankingWeightsSchema = z.object(rankingWeightsShape);
export type RankingWeightsInput = z.infer<typeof rankingWeightsSchema>;

export const rankingWeightsPartialSchema = z.object(rankingWeightsShape).partial();
export type RankingWeightsPartialInput = z.infer<typeof rankingWeightsPartialSchema>;

/** Config EFETIVA (default + override aplicado) — retornada por `getEffectiveBusinessConfig`. */
export const adminBusinessConfigDTOSchema = z.object({
  lessonCompletionMinPercent: z.number().min(0.01).max(1),
  dailyGoalTargetPoints: z.number().int().min(0),
  weeklyGoalTargetPoints: z.number().int().min(0),
  gamificationRewards: gamificationRewardsSchema,
  rankingWeights: rankingWeightsSchema,
  /** `true` quando ao menos um valor acima difere do default de `@/config/business.ts`. */
  hasOverrides: z.boolean(),
});
export type AdminBusinessConfigDTO = z.infer<typeof adminBusinessConfigDTOSchema>;

/** Entrada de `updateBusinessConfigAction` — todos os campos opcionais (PATCH parcial); pesos de
 *  ranking, quando informados, devem somar 1 (± tolerância), validado no service. */
export const updateBusinessConfigInputSchema = z.object({
  lessonCompletionMinPercent: z.number().min(0.01).max(1).optional(),
  dailyGoalTargetPoints: z.coerce.number().int().min(0).max(1_000_000).optional(),
  weeklyGoalTargetPoints: z.coerce.number().int().min(0).max(1_000_000).optional(),
  gamificationRewards: gamificationRewardsPartialSchema.optional(),
  rankingWeights: rankingWeightsPartialSchema.optional(),
});
export type UpdateBusinessConfigInput = z.infer<typeof updateBusinessConfigInputSchema>;
