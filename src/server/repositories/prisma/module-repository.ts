import type { Module as Row } from "@/generated/prisma/client";
import type {
  ModuleEntity,
  ModuleRepository,
  ModuleCreateInput,
  ModuleUpdateInput,
} from "../contracts/module-repository";
function map(row: Row): ModuleEntity {
  if (!row.subjectId || !row.slug)
    throw new Error("Module requires subject and slug backfill: " + row.id);
  return {
    id: row.id,
    courseId: row.courseId,
    subjectId: row.subjectId,
    order: row.order,
    slug: row.slug,
    title: row.title,
    description: row.description,
    teacherId: row.teacherId,
    status: row.status,
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}
export class PrismaModuleRepository implements ModuleRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.module.findUnique({ where: { id } });
    return row ? map(row) : null;
  }
  async listByCourseId(courseId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.module.findMany({
        where: { courseId, status: "PUBLISHED", deletedAt: null },
        orderBy: { order: "asc" },
      })
    ).map(map);
  }
  async listByCourseIdForAdmin(courseId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (await prisma.module.findMany({ where: { courseId }, orderBy: { order: "asc" } })).map(
      map,
    );
  }
  async create(input: ModuleCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    return inRepositoryTransaction(async () => {
      await prisma.$queryRaw`SELECT "id" FROM "Course" WHERE "id" = ${input.courseId} FOR UPDATE`;
      const { now, ...data } = input;
      const maximum = await prisma.module.aggregate({
        where: { courseId: input.courseId },
        _max: { order: true },
      });
      return map(
        await prisma.module.create({
          data: {
            ...data,
            order: input.order ?? (maximum._max.order ?? 0) + 1,
            createdAt: now,
            updatedAt: now,
          },
        }),
      );
    });
  }
  async update(input: ModuleUpdateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { id, now, ...data } = input;
    return map(await prisma.module.update({ where: { id }, data: { ...data, updatedAt: now } }));
  }
  async softDelete(id: string, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.module.update({ where: { id }, data: { deletedAt: now, updatedAt: now } }),
    );
  }
  async reorder(courseId: string, orderedModuleIds: string[], now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    return inRepositoryTransaction(async () => {
      await prisma.$queryRaw`SELECT "id" FROM "Course" WHERE "id" = ${courseId} FOR UPDATE`;
      const rows = await prisma.module.findMany({ where: { courseId }, orderBy: { order: "asc" } });
      if (
        new Set(orderedModuleIds).size !== rows.length ||
        orderedModuleIds.length !== rows.length ||
        rows.some((row) => !orderedModuleIds.includes(row.id))
      )
        throw new Error("Reorder requires all siblings exactly once");
      // Move above the current range before assigning final positions, preserving the unique index.
      const base = Math.max(rows.length, ...rows.map((row) => row.order), 0) + 1;
      for (let i = 0; i < orderedModuleIds.length; i++)
        await prisma.module.update({
          where: { id: orderedModuleIds[i]! },
          data: { order: base + i, updatedAt: now },
        });
      for (let i = 0; i < orderedModuleIds.length; i++)
        await prisma.module.update({
          where: { id: orderedModuleIds[i]! },
          data: { order: i + 1, updatedAt: now },
        });
      return (await prisma.module.findMany({ where: { courseId }, orderBy: { order: "asc" } })).map(
        map,
      );
    });
  }
}
