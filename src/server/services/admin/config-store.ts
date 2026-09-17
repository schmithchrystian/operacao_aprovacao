import { env } from "@/config/env";
import { RANKING_WEIGHTS } from "@/config/business";
import { updateBusinessConfigInputSchema, type UpdateBusinessConfigInput } from "@/contracts/admin-config";
import { ConflictError, ValidationError } from "@/server/errors";
import { mockStore } from "@/server/repositories/mock/mock-store";

export type BusinessConfigOverride = UpdateBusinessConfigInput;
export interface BusinessConfigSnapshot { value: BusinessConfigOverride; version: number }
const box = mockStore<BusinessConfigSnapshot>("admin-business-config-override", () => ({ value: {}, version: 1 }));

export async function getBusinessConfigSnapshot(): Promise<BusinessConfigSnapshot> {
  if (env.DATA_SOURCE === "mock") return { value: structuredClone(box.value), version: box.version };
  const { prisma } = await import("@/server/db/prisma");
  const row = await prisma.businessConfig.findUnique({ where: { id: "business" } });
  return row ? { value: updateBusinessConfigInputSchema.parse(row.value), version: row.version } : { value: {}, version: 1 };
}

export async function getBusinessConfigOverride(): Promise<BusinessConfigOverride> {
  return (await getBusinessConfigSnapshot()).value;
}

function merge(current: BusinessConfigOverride, patch: BusinessConfigOverride): BusinessConfigOverride {
  const value = updateBusinessConfigInputSchema.parse({
    ...current, ...patch,
    gamificationRewards: { ...current.gamificationRewards, ...patch.gamificationRewards },
    rankingWeights: { ...current.rankingWeights, ...patch.rankingWeights },
  });
  const sum = Object.values({ ...RANKING_WEIGHTS, ...value.rankingWeights }).reduce((total, weight) => total + weight, 0);
  if (Math.abs(sum - 1) > 0.001) throw new ValidationError("Os pesos de ranking devem somar 1 (100%).");
  return value;
}

/** Compare-and-swap retries merge with the latest persisted value; concurrent patches are not lost. */
export async function setBusinessConfigOverride(patch: BusinessConfigOverride): Promise<BusinessConfigOverride> {
  patch = updateBusinessConfigInputSchema.parse(patch);
  if (env.DATA_SOURCE === "mock") {
    box.value = merge(box.value, patch);
    box.version += 1;
    return structuredClone(box.value);
  }
  const { prisma } = await import("@/server/db/prisma");
  await prisma.businessConfig.upsert({ where: { id: "business" }, create: { id: "business", value: {}, version: 1 }, update: {} });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await getBusinessConfigSnapshot();
    const value = merge(current.value, patch);
    const updated = await prisma.businessConfig.updateMany({
      where: { id: "business", version: current.version },
      data: { value, version: { increment: 1 } },
    });
    if (updated.count === 1) return value;
  }
  throw new ConflictError("A configuração mudou durante a edição. Tente novamente.");
}

export function __resetBusinessConfigOverrideStore(): void {
  box.value = {};
  box.version = 1;
}
