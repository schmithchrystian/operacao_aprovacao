import type { Profile as Row } from "@/generated/prisma/client";
import {
  DEFAULT_PRIVACY_SETTINGS,
  type ProfileEntity,
  type ProfileRepository,
  type ProfileCreateInput,
  type ProfileUpdateInput,
  type ProfilePrivacyUpdateInput,
} from "../contracts/profile-repository";
function map(row: Row): ProfileEntity {
  return {
    id: row.id,
    userId: row.userId,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    phone: row.phone,
    birthDate: row.birthDate?.toISOString() ?? null,
    city: row.city,
    state: row.state,
    targetContestId: row.targetContestId,
    isProfilePublic: row.isProfilePublic,
    showInRanking: row.showInRanking,
    showRealName: row.showRealName,
    showCityState: row.showCityState,
    showStudyHours: row.showStudyHours,
    showPerformance: row.showPerformance,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export class PrismaProfileRepository implements ProfileRepository {
  async findByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.profile.findFirst({ where: { userId, deletedAt: null } });
    return row ? map(row) : null;
  }
  async findByUserIds(userIds: readonly string[]) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.profile.findMany({ where: { userId: { in: [...userIds] }, deletedAt: null } })
    ).map(map);
  }
  async create({ userId, now }: ProfileCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    return inRepositoryTransaction(async () => {
      await prisma.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${userId} FOR UPDATE`;
      const existing = await prisma.profile.findUnique({ where: { userId } });
      if (existing) {
        if (existing.deletedAt) throw new Error("Profile is deleted");
        return map(existing);
      }
      return map(
        await prisma.profile.create({
          data: { userId, ...DEFAULT_PRIVACY_SETTINGS, createdAt: now, updatedAt: now },
        }),
      );
    });
  }

  async update({ userId, now, birthDate, ...data }: ProfileUpdateInput) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.profile.update({
        where: { userId, deletedAt: null },
        data: {
          ...data,
          ...(birthDate === undefined
            ? {}
            : { birthDate: birthDate === null ? null : new Date(birthDate) }),
          updatedAt: now,
        },
      }),
    );
  }
  async updatePrivacy({ userId, now, ...data }: ProfilePrivacyUpdateInput) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.profile.update({
        where: { userId, deletedAt: null },
        data: { ...data, updatedAt: now },
      }),
    );
  }
}
