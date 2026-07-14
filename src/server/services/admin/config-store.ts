import type { GamificationRewardEventType, RankingWeightKey } from "@/config/business";
import { mockStore } from "@/server/repositories/mock/mock-store";

/**
 * Store de OVERRIDE em runtime da configuração de negócio (Fase 17 — agente `backend`). Ver
 * PENDÊNCIA detalhada em `@/contracts/admin-config.ts`: este override NÃO está conectado aos
 * motores reais (gamificação/ranking/study-tracking) nesta fase — existe para o admin
 * consultar/ajustar a INTENÇÃO de configuração.
 *
 * Persistência: em memória de processo via `mockStore` (mesmo padrão de qualquer estado mock
 * mutável deste projeto — `@/server/repositories/mock/mock-store.ts`, também usado por
 * rate-limiters como `@/server/services/simulations/rate-limit.ts`). TODO (fase de banco):
 * persistir de verdade (ex.: uma tabela `BusinessConfigOverride` ou reaproveitar `AuditLog`
 * para reconstrução) — hoje se perde a cada reinício do processo, igual a `auditLog`.
 */
export interface BusinessConfigOverride {
  lessonCompletionMinPercent?: number;
  dailyGoalTargetPoints?: number;
  weeklyGoalTargetPoints?: number;
  gamificationRewards?: Partial<Record<GamificationRewardEventType, { points: number; xp: number }>>;
  rankingWeights?: Partial<Record<RankingWeightKey, number>>;
}

/** Caixa `{ value }` (mesmo padrão de contador/sequência dos repositórios mock) — nunca
 *  reatribuir `box`, só `box.value` (ver nota de estabilidade de identidade em `mock-store.ts`). */
const box = mockStore<{ value: BusinessConfigOverride }>("admin-business-config-override", () => ({ value: {} }));

export function getBusinessConfigOverride(): BusinessConfigOverride {
  return box.value;
}

/** Faz merge RASO no nível dos grupos (`gamificationRewards`/`rankingWeights`) e merge de UM
 *  nível dentro deles — preserva chaves não informadas em `patch`. */
export function setBusinessConfigOverride(patch: BusinessConfigOverride): BusinessConfigOverride {
  box.value = {
    ...box.value,
    ...patch,
    gamificationRewards:
      patch.gamificationRewards || box.value.gamificationRewards
        ? { ...box.value.gamificationRewards, ...patch.gamificationRewards }
        : undefined,
    rankingWeights:
      patch.rankingWeights || box.value.rankingWeights
        ? { ...box.value.rankingWeights, ...patch.rankingWeights }
        : undefined,
  };
  return box.value;
}

/** Uso exclusivo de testes — restaura o store ao estado vazio (sem overrides). */
export function __resetBusinessConfigOverrideStore(): void {
  box.value = {};
}
