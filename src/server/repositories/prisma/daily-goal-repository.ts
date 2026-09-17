import { randomUUID } from "node:crypto";
import type { DailyGoal as Row } from "@/generated/prisma/client";
import type {
  DailyGoalEntity,
  DailyGoalRepository,
  DailyGoalUpsertInput,
} from "../contracts/daily-goal-repository";
function map(row: Row): DailyGoalEntity {
  return {
    id: row.id,
    userId: row.userId,
    date: row.date.toISOString(),
    targetMinutes: row.targetMinutes,
    targetPoints: row.targetPoints,
    achieved: row.achieved,
    achievedAt: row.achievedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export class PrismaDailyGoalRepository implements DailyGoalRepository {
  async findByUserIdAndDate(userId: string, date: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.dailyGoal.findUnique({
      where: { userId_date: { userId, date: new Date(date) } },
    });
    return row ? map(row) : null;
  }
  async listByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (await prisma.dailyGoal.findMany({ where: { userId }, orderBy: { date: "asc" } })).map(
      map,
    );
  }
  async upsert(input: DailyGoalUpsertInput) {
    const { prisma } = await import("@/server/db/prisma");
    const date = new Date(input.date),
      achievedAt = input.achievedAt ? new Date(input.achievedAt) : null;
    const rows = await prisma.$queryRaw<
      Row[]
    >`INSERT INTO "DailyGoal" ("id","userId","date","targetMinutes","targetPoints","achieved","achievedAt","createdAt","updatedAt") VALUES (${randomUUID()},${input.userId},${date},${input.targetMinutes},${input.targetPoints},${input.achieved},${achievedAt},${input.now},${input.now}) ON CONFLICT ("userId","date") DO UPDATE SET "targetMinutes"=CASE WHEN EXCLUDED."updatedAt">="DailyGoal"."updatedAt" THEN EXCLUDED."targetMinutes" ELSE "DailyGoal"."targetMinutes" END,"targetPoints"=CASE WHEN EXCLUDED."updatedAt">="DailyGoal"."updatedAt" THEN EXCLUDED."targetPoints" ELSE "DailyGoal"."targetPoints" END,"achieved"="DailyGoal"."achieved" OR EXCLUDED."achieved","achievedAt"=COALESCE("DailyGoal"."achievedAt",EXCLUDED."achievedAt"),"updatedAt"=GREATEST("DailyGoal"."updatedAt",EXCLUDED."updatedAt") RETURNING *`;
    return map(rows[0]!);
  }
}
