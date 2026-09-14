import type { Prisma } from "@/generated/prisma/client";
import type {
  UserAchievementRepository,
  UserAchievementEntity,
} from "../contracts/user-achievement-repository";
const include = { achievement: { select: { key: true } } };
type Row = Prisma.UserAchievementGetPayload<{ include: typeof include }>;
function map(row: Row): UserAchievementEntity {
  return {
    userId: row.userId,
    achievementKey: row.achievement.key,
    unlockedAt: row.unlockedAt.toISOString(),
  };
}
export class PrismaUserAchievementRepository implements UserAchievementRepository {
  async listByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.userAchievement.findMany({
        where: { userId },
        include,
        orderBy: { unlockedAt: "desc" },
      })
    ).map(map);
  }
  async findByUserAndKey(userId: string, achievementKey: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.userAchievement.findFirst({
      where: { userId, achievement: { key: achievementKey } },
      include,
    });
    return row ? map(row) : null;
  }
  async unlock(userId: string, achievementKey: string, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    const achievement = await prisma.achievement.findUniqueOrThrow({
      where: { key: achievementKey, deletedAt: null },
    });
    const row = await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      create: { userId, achievementId: achievement.id, unlockedAt: now },
      update: { userId },
    });
    return map({ ...row, achievement: { key: achievement.key } });
  }
}
