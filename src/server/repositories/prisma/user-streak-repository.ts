import type { UserStreak as Row } from "@/generated/prisma/client";
import type {
  UserStreakEntity,
  UserStreakRepository,
  UserStreakUpsertInput,
} from "../contracts/user-streak-repository";
function map(row: Row): UserStreakEntity {
  return {
    userId: row.userId,
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    lastActiveDate: row.lastActiveDate?.toISOString() ?? null,
    freezesAvailable: row.freezesAvailable,
    updatedAt: row.updatedAt.toISOString(),
  };
}
export class PrismaUserStreakRepository implements UserStreakRepository {
  async findByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.userStreak.findUnique({ where: { userId } });
    return row ? map(row) : null;
  }
  async upsert(input: UserStreakUpsertInput) {
    const { prisma } = await import("@/server/db/prisma");
    const date = input.lastActiveDate ? new Date(input.lastActiveDate) : null;
    const rows = await prisma.$queryRaw<
      Row[]
    >`INSERT INTO "UserStreak" ("userId","currentStreak","longestStreak","lastActiveDate","freezesAvailable","updatedAt") VALUES (${input.userId},${input.currentStreak},${input.longestStreak},${date},${input.freezesAvailable},${input.now}) ON CONFLICT ("userId") DO UPDATE SET "currentStreak"=CASE WHEN EXCLUDED."updatedAt">="UserStreak"."updatedAt" THEN EXCLUDED."currentStreak" ELSE "UserStreak"."currentStreak" END,"longestStreak"=GREATEST("UserStreak"."longestStreak",EXCLUDED."longestStreak"),"lastActiveDate"=CASE WHEN EXCLUDED."updatedAt">="UserStreak"."updatedAt" THEN EXCLUDED."lastActiveDate" ELSE "UserStreak"."lastActiveDate" END,"freezesAvailable"=CASE WHEN EXCLUDED."updatedAt">="UserStreak"."updatedAt" THEN EXCLUDED."freezesAvailable" ELSE "UserStreak"."freezesAvailable" END,"updatedAt"=GREATEST("UserStreak"."updatedAt",EXCLUDED."updatedAt") RETURNING *`;
    return map(rows[0]!);
  }
}
