import {
  GAMIFICATION_REWARDS,
  LESSON_COMPLETION_MIN_PERCENT,
  RANKING_WEIGHTS,
  STUDY_TRACKING_OVERVIEW,
  type GamificationRewardEventType,
  type RankingWeightKey,
} from "@/config/business";
import type { AdminBusinessConfigDTO } from "@/contracts/admin-config";
import { getBusinessConfigSnapshot } from "./config-store";

/** Pure server configuration read: no request session required. */
export async function getEffectiveBusinessConfig(): Promise<AdminBusinessConfigDTO & { version: number }> {
  const { value: override, version } = await getBusinessConfigSnapshot();

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
    version,
    lessonCompletionMinPercent: override.lessonCompletionMinPercent ?? LESSON_COMPLETION_MIN_PERCENT,
    dailyGoalTargetPoints: override.dailyGoalTargetPoints ?? STUDY_TRACKING_OVERVIEW.dailyGoalTargetPoints,
    weeklyGoalTargetPoints: override.weeklyGoalTargetPoints ?? STUDY_TRACKING_OVERVIEW.weeklyGoalTargetPoints,
    gamificationRewards,
    rankingWeights,
    hasOverrides,
  };
}
