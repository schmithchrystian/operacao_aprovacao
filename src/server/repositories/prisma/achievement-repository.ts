import { Prisma, type Achievement as Row } from "@/generated/prisma/client";
import type {
  AchievementEntity,
  AchievementRepository,
  AchievementCreateInput,
  AchievementUpdateInput,
} from "../contracts/achievement-repository";
// Metadata CRUD does not change the separate gamification unlock predicates.
function map(row: Row): AchievementEntity {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    icon: row.icon,
    criteria: row.criteria,
    points: row.points,
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}
function json(value: unknown) {
  return value === null
    ? Prisma.DbNull
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}
export class PrismaAchievementRepository implements AchievementRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.achievement.findUnique({ where: { id } });
    return row ? map(row) : null;
  }
  async findByKey(key: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.achievement.findUnique({ where: { key } });
    return row ? map(row) : null;
  }
  async list() {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.achievement.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } })
    ).map(map);
  }
  async listForAdmin() {
    const { prisma } = await import("@/server/db/prisma");
    return (await prisma.achievement.findMany({ orderBy: { name: "asc" } })).map(map);
  }
  async create({ now, criteria, ...data }: AchievementCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.achievement.create({
        data: {
          ...data,
          ...(criteria === undefined ? {} : { criteria: json(criteria) }),
          createdAt: now,
          updatedAt: now,
        },
      }),
    );
  }
  async update({ id, now, criteria, ...data }: AchievementUpdateInput) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.achievement.update({
        where: { id },
        data: {
          ...data,
          ...(criteria === undefined ? {} : { criteria: json(criteria) }),
          updatedAt: now,
        },
      }),
    );
  }
  async softDelete(id: string, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.achievement.update({ where: { id }, data: { deletedAt: now, updatedAt: now } }),
    );
  }
}
