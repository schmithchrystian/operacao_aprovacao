import type { AdminBusinessConfigDTO, UpdateBusinessConfigInput } from "@/contracts/admin-config";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { ValidationError } from "@/server/errors";
import { setBusinessConfigOverride } from "./config-store";
import { getEffectiveBusinessConfig } from "./effective-config";
import { SENSITIVE_ADMIN_ONLY_ROLES } from "./roles";
export { getEffectiveBusinessConfig } from "./effective-config";
const RANKING_WEIGHT_SUM_TOLERANCE = 0.001;

export const getBusinessConfigForAdmin = withAdminAudit(
  { operation: "admin.config.read", entity: "BusinessConfig", roles: [...SENSITIVE_ADMIN_ONLY_ROLES] },
  async (): Promise<AdminBusinessConfigDTO> => {
    return getEffectiveBusinessConfig();
  },
);

export const updateBusinessConfigForAdmin = withAdminAudit(
  { operation: "admin.config.update", entity: "BusinessConfig", roles: [...SENSITIVE_ADMIN_ONLY_ROLES] },
  async (_session, input: UpdateBusinessConfigInput): Promise<AdminBusinessConfigDTO> => {
    if (input.rankingWeights) {
      const currentWeights = (await getEffectiveBusinessConfig()).rankingWeights;
      const merged = { ...currentWeights, ...input.rankingWeights };
      const sum = Object.values(merged).reduce((total, weight) => total + weight, 0);
      if (Math.abs(sum - 1) > RANKING_WEIGHT_SUM_TOLERANCE) {
        throw new ValidationError("Os pesos de ranking devem somar 1 (100%).", {
          rankingWeights: [`A soma informada é ${sum.toFixed(3)}; ajuste os pesos para somar 1.`],
        });
      }
    }
    await setBusinessConfigOverride(input);
    return getEffectiveBusinessConfig();
  },
);
