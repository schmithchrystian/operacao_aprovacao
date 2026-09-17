import type { Lesson as Row } from "@/generated/prisma/client";
import type {
  LessonEntity,
  LessonRepository,
  LessonCreateInput,
  LessonUpdateInput,
} from "../contracts/lesson-repository";
function map(row: Row): LessonEntity {
  return {
    id: row.id,
    moduleId: row.moduleId,
    order: row.order,
    title: row.title,
    requiresLessonId: row.requiresLessonId,
    videoUrl: row.videoUrl,
    teacherId: row.teacherId,
    status: row.status,
    durationMinutes: row.durationSeconds / 60,
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}
export class PrismaLessonRepository implements LessonRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.lesson.findUnique({ where: { id } });
    return row ? map(row) : null;
  }
  async listByModuleId(moduleId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.lesson.findMany({
        where: { moduleId, status: "PUBLISHED", deletedAt: null },
        orderBy: { order: "asc" },
      })
    ).map(map);
  }
  async listByModuleIdForAdmin(moduleId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (await prisma.lesson.findMany({ where: { moduleId }, orderBy: { order: "asc" } })).map(
      map,
    );
  }
  async create(input: LessonCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    return inRepositoryTransaction(async () => {
      await prisma.$queryRaw`SELECT "id" FROM "Module" WHERE "id" = ${input.moduleId} FOR UPDATE`;
      const { now, durationMinutes, ...data } = input;
      const durationSeconds = Math.round(durationMinutes * 60);
      const maximum = await prisma.lesson.aggregate({
        where: { moduleId: input.moduleId },
        _max: { order: true },
      });
      return map(
        await prisma.lesson.create({
          data: {
            ...data,
            durationSeconds,
            order: input.order ?? (maximum._max.order ?? 0) + 1,
            createdAt: now,
            updatedAt: now,
          },
        }),
      );
    });
  }
  async update(input: LessonUpdateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { id, now, durationMinutes, ...data } = input;
    return map(
      await prisma.lesson.update({
        where: { id },
        data: {
          ...data,
          ...(durationMinutes === undefined
            ? {}
            : { durationSeconds: Math.round(durationMinutes * 60) }),
          updatedAt: now,
        },
      }),
    );
  }
  async softDelete(id: string, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.lesson.update({ where: { id }, data: { deletedAt: now, updatedAt: now } }),
    );
  }
  async reorder(moduleId: string, orderedLessonIds: string[], now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    return inRepositoryTransaction(async () => {
      await prisma.$queryRaw`SELECT "id" FROM "Module" WHERE "id" = ${moduleId} FOR UPDATE`;
      const rows = await prisma.lesson.findMany({ where: { moduleId }, orderBy: { order: "asc" } });
      if (
        new Set(orderedLessonIds).size !== rows.length ||
        orderedLessonIds.length !== rows.length ||
        rows.some((row) => !orderedLessonIds.includes(row.id))
      )
        throw new Error("Reorder requires all siblings exactly once");
      // Move above the current range before assigning final positions, preserving the unique index.
      const base = Math.max(rows.length, ...rows.map((row) => row.order), 0) + 1;
      for (let i = 0; i < orderedLessonIds.length; i++)
        await prisma.lesson.update({
          where: { id: orderedLessonIds[i]! },
          data: { order: base + i, updatedAt: now },
        });
      for (let i = 0; i < orderedLessonIds.length; i++)
        await prisma.lesson.update({
          where: { id: orderedLessonIds[i]! },
          data: { order: i + 1, updatedAt: now },
        });
      return (await prisma.lesson.findMany({ where: { moduleId }, orderBy: { order: "asc" } })).map(
        map,
      );
    });
  }
}
