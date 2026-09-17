import { Prisma, type RankingScore as Row } from "@/generated/prisma/client";
import { z } from "zod";
import type {
  FinalizeRankingScopeVersionInput,
  RankingScoreRepository,
  RankingScoreEntity,
  RankingScoreUpsertInput,
  RankingPeriodType,
  RankingScopeType,
} from "../contracts/ranking-score-repository";
const metric = z.object({
  raw: z.number(),
  normalized: z.number(),
  weight: z.number(),
  contribution: z.number(),
});
const breakdownSchema = z.object({
  metrics: z.object({
    mockExamPerformance: metric,
    lessonsCompleted: metric,
    consistency: metric,
    validHours: metric,
    goalsCompleted: metric,
  }),
  display: z.object({ points: z.number(), xp: z.number(), streakDays: z.number() }),
});
function map(row: Row): RankingScoreEntity {
  return {
    ...row,
    breakdown: row.breakdown === null ? null : breakdownSchema.parse(row.breakdown),
    calculatedAt: row.calculatedAt.toISOString(),
  };
}
function scope(
  periodType: RankingPeriodType,
  periodKey: string,
  scopeType: RankingScopeType,
  scopeKey: string,
) {
  return { periodType, periodKey, scopeType, scopeKey };
}
export class PrismaRankingScoreRepository implements RankingScoreRepository {
  async listKnownScopes(): Promise<Array<{ scopeType: RankingScopeType; scopeKey: string }>> {
    const { prisma } = await import("@/server/db/prisma");
    const [snapshots, legacy] = await Promise.all([
      prisma.rankingSnapshot.findMany({ select: { scopeType: true, scopeKey: true }, distinct: ["scopeType", "scopeKey"] }),
      prisma.rankingScore.findMany({ select: { scopeType: true, scopeKey: true }, distinct: ["scopeType", "scopeKey"] }),
    ]);
    return [...new Map([...snapshots, ...legacy].map(row => [`${row.scopeType}:${row.scopeKey}`, row])).values()];
  }
  async finalizeScopeVersion(input: FinalizeRankingScopeVersionInput): Promise<void> {
    const { prisma } = await import("@/server/db/prisma");
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    const { userIds, now, ...key } = input;
    await inRepositoryTransaction(async () => {
      await prisma.rankingScore.deleteMany({ where: { ...key, ...(userIds.length ? { userId: { notIn: userIds } } : {}) } });
      await prisma.rankingSnapshot.upsert({
        where: { periodType_periodKey_scopeType_scopeKey_calculationVersion: key },
        create: { ...key, calculatedAt: now }, update: { calculatedAt: now },
      });
    });
  }

  async upsert(input: RankingScoreUpsertInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { now, breakdown, ...rest } = input;
    const data = {
      ...rest,
      calculatedAt: now,
      breakdown:
        breakdown == null
          ? Prisma.DbNull
          : (JSON.parse(JSON.stringify(breakdownSchema.parse(breakdown))) as Prisma.InputJsonValue),
    };
    const { userId, periodType, periodKey, scopeType, scopeKey, calculationVersion } = input;
    return map(
      await prisma.rankingScore.upsert({
        where: {
          userId_periodType_periodKey_scopeType_scopeKey_calculationVersion: {
            userId,
            periodType,
            periodKey,
            scopeType,
            scopeKey,
            calculationVersion,
          },
        },
        create: data,
        update: data,
      }),
    );
  }
  async listByScopeAndVersion(
    periodType: RankingPeriodType,
    periodKey: string,
    scopeType: RankingScopeType,
    scopeKey: string,
    calculationVersion: number,
  ) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.rankingScore.findMany({
        where: { ...scope(periodType, periodKey, scopeType, scopeKey), calculationVersion },
        orderBy: { rank: "asc" },
      })
    ).map(map);
  }
  async findLatestVersion(
    periodType: RankingPeriodType,
    periodKey: string,
    scopeType: RankingScopeType,
    scopeKey: string,
  ) {
    const versions = await this.listVersionsDesc(periodType, periodKey, scopeType, scopeKey);
    return versions[0] ?? null;
  }

  async listVersionsDesc(
    periodType: RankingPeriodType,
    periodKey: string,
    scopeType: RankingScopeType,
    scopeKey: string,
  ) {
    const { prisma } = await import("@/server/db/prisma");
    const [snapshots, legacy] = await Promise.all([
      prisma.rankingSnapshot.findMany({ where: scope(periodType, periodKey, scopeType, scopeKey), select: { calculationVersion: true } }),
      prisma.rankingScore.findMany({ where: scope(periodType, periodKey, scopeType, scopeKey), select: { calculationVersion: true }, distinct: ["calculationVersion"] }),
    ]);
    return [...new Set([...snapshots, ...legacy].map(row => row.calculationVersion))].sort((a, b) => b - a);
  }

  async findByUserScopeAndVersion(
    userId: string,
    periodType: RankingPeriodType,
    periodKey: string,
    scopeType: RankingScopeType,
    scopeKey: string,
    calculationVersion: number,
  ) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.rankingScore.findUnique({
      where: {
        userId_periodType_periodKey_scopeType_scopeKey_calculationVersion: {
          userId,
          ...scope(periodType, periodKey, scopeType, scopeKey),
          calculationVersion,
        },
      },
    });
    return row ? map(row) : null;
  }
}
