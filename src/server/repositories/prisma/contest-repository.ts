import type { Contest as Row } from "@/generated/prisma/client";
import type {
  ContestEntity,
  ContestRepository,
  ContestCreateInput,
  ContestUpdateInput,
} from "../contracts/contest-repository";

function map(row: Row): ContestEntity {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    organizingBoard: row.organizingBoard,
    description: row.description,
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

export class PrismaContestRepository implements ContestRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.contest.findUnique({ where: { id } });
    return row ? map(row) : null;
  }
  async findBySlug(slug: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.contest.findUnique({ where: { slug } });
    return row ? map(row) : null;
  }
  async list() {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.contest.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } })
    ).map(map);
  }
  async listForAdmin() {
    const { prisma } = await import("@/server/db/prisma");
    return (await prisma.contest.findMany({ orderBy: { name: "asc" } })).map(map);
  }
  async create(input: ContestCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { now, ...data } = input;
    return map(await prisma.contest.create({ data: { ...data, createdAt: now, updatedAt: now } }));
  }
  async update(input: ContestUpdateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { id, now, ...data } = input;
    return map(await prisma.contest.update({ where: { id }, data: { ...data, updatedAt: now } }));
  }
  async softDelete(id: string, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.contest.update({ where: { id }, data: { deletedAt: now, updatedAt: now } }),
    );
  }
}
