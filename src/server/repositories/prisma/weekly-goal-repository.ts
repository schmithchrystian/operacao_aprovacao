import { randomUUID } from "node:crypto";
import type { WeeklyGoal as Row } from "@/generated/prisma/client";
import type {
  WeeklyGoalEntity,
  WeeklyGoalRepository,
  WeeklyGoalUpsertInput,
} from "../contracts/weekly-goal-repository";
function map(row: Row): WeeklyGoalEntity {
  return {
    id: row.id,
    userId: row.userId,
    weekStart: row.weekStart.toISOString(),
    targetMinutes: row.targetMinutes,
    targetPoints: row.targetPoints,
    achieved: row.achieved,
    achievedAt: row.achievedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export class PrismaWeeklyGoalRepository implements WeeklyGoalRepository {
  async findByUserIdAndWeekStart(userId: string, weekStart: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.weeklyGoal.findUnique({
      where: { userId_weekStart: { userId, weekStart: new Date(weekStart) } },
    });
    return row ? map(row) : null;
  }
  async listByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.weeklyGoal.findMany({ where: { userId }, orderBy: { weekStart: "asc" } })
    ).map(map);
  }
  async upsert(input: WeeklyGoalUpsertInput) {
    const { prisma } = await import("@/server/db/prisma");
    const date = new Date(input.weekStart),
      achievedAt = input.achievedAt ? new Date(input.achievedAt) : null;
    const rows = await prisma.$queryRaw<
      Row[]
    >`INSERT INTO "WeeklyGoal" ("id","userId","weekStart","targetMinutes","targetPoints","achieved","achievedAt","createdAt","updatedAt") VALUES (${randomUUID()},${input.userId},${date},${input.targetMinutes},${input.targetPoints},${input.achieved},${achievedAt},${input.now},${input.now}) ON CONFLICT ("userId","weekStart") DO UPDATE SET "targetMinutes"=CASE WHEN EXCLUDED."updatedAt">="WeeklyGoal"."updatedAt" THEN EXCLUDED."targetMinutes" ELSE "WeeklyGoal"."targetMinutes" END,"targetPoints"=CASE WHEN EXCLUDED."updatedAt">="WeeklyGoal"."updatedAt" THEN EXCLUDED."targetPoints" ELSE "WeeklyGoal"."targetPoints" END,"achieved"="WeeklyGoal"."achieved" OR EXCLUDED."achieved","achievedAt"=COALESCE("WeeklyGoal"."achievedAt",EXCLUDED."achievedAt"),"updatedAt"=GREATEST("WeeklyGoal"."updatedAt",EXCLUDED."updatedAt") RETURNING *`;
    return map(rows[0]!);
  }
}
