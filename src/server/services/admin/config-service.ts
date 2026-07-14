import {
  GAMIFICATION_REWARDS,
  LESSON_COMPLETION_MIN_PERCENT,
  RANKING_WEIGHTS,
  STUDY_TRACKING_OVERVIEW,
  type GamificationRewardEventType,
  type RankingWeightKey,
} from "@/config/business";
import type { AdminBusinessConfigDTO, UpdateBusinessConfigInput } from "@/contracts/admin-config";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { ValidationError } from "@/server/errors";
import { getBusinessConfigOverride, setBusinessConfigOverride } from "./config-store";
import { SENSITIVE_ADMIN_ONLY_ROLES } from "./roles";

/**
 * Serviço de configuração administrativa (Fase 17 — só `admin`, CLAUDE.md/Fase 17:
 * "Configuração... Só admin"). Ver PENDÊNCIA de integração em `@/contracts/admin-config.ts` e
 * `./config-store.ts`.
 */

const RANKING_WEIGHT_SUM_TOLERANCE = 0.001;

function buildEffectiveConfig(): AdminBusinessConfigDTO {
  const override = getBusinessConfigOverride();

  const gamificationRewards = Object.fromEntries(
    (Object.keys(GAMIFICATION_REWARDS) as GamificationRewardEventType[]).map((key) => [
      key,
      override.gamificationRewards?.[key] ?? GAMIFICATION_REWARDS[key],
    ]),
  ) as AdminBusinessConfigDTO["gamificationRewards"];

  const rankingWeights = Object.fromEntries(
    (Object.keys(RANKING_WEIGHTS) as RankingWeightKey[]).map((key) => [
      key,
      override.rankingWeights?.[key] ?? RANKING_WEIGHTS[key],
    ]),
  ) as AdminBusinessConfigDTO["rankingWeights"];

  const hasOverrides =
    override.lessonCompletionMinPercent !== undefined ||
    override.dailyGoalTargetPoints !== undefined ||
    override.weeklyGoalTargetPoints !== undefined ||
    Object.keys(override.gamificationRewards ?? {}).length > 0 ||
    Object.keys(override.rankingWeights ?? {}).length > 0;

  return {
    lessonCompletionMinPercent: override.lessonCompletionMinPercent ?? LESSON_COMPLETION_MIN_PERCENT,
    dailyGoalTargetPoints: override.dailyGoalTargetPoints ?? STUDY_TRACKING_OVERVIEW.dailyGoalTargetPoints,
    weeklyGoalTargetPoints: override.weeklyGoalTargetPoints ?? STUDY_TRACKING_OVERVIEW.weeklyGoalTargetPoints,
    gamificationRewards,
    rankingWeights,
    hasOverrides,
  };
}

export const getBusinessConfigForAdmin = withAdminAudit(
  { operation: "admin.config.read", entity: "BusinessConfig", roles: [...SENSITIVE_ADMIN_ONLY_ROLES] },
  async (): Promise<AdminBusinessConfigDTO> => {
    return buildEffectiveConfig();
  },
);

export const updateBusinessConfigForAdmin = withAdminAudit(
  { operation: "admin.config.update", entity: "BusinessConfig", roles: [...SENSITIVE_ADMIN_ONLY_ROLES] },
  async (_session, input: UpdateBusinessConfigInput): Promise<AdminBusinessConfigDTO> => {
    if (input.rankingWeights) {
      const currentWeights = buildEffectiveConfig().rankingWeights;
      const merged = { ...currentWeights, ...input.rankingWeights };
      const sum = Object.values(merged).reduce((total, weight) => total + weight, 0);
      if (Math.abs(sum - 1) > RANKING_WEIGHT_SUM_TOLERANCE) {
        throw new ValidationError("Os pesos de ranking devem somar 1 (100%).", {
          rankingWeights: [`A soma informada é ${sum.toFixed(3)}; ajuste os pesos para somar 1.`],
        });
      }
    }
    setBusinessConfigOverride(input);
    return buildEffectiveConfig();
  },
);
