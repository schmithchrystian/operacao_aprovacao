import type { StudyPlanItem as Row } from "@/generated/prisma/client";
import type {
  StudyPlanItemEntity,
  StudyPlanItemRepository,
  StudyPlanItemCreateInput,
  StudyPlanItemUpdateInput,
} from "../contracts/study-plan-item-repository";
function map(row: Row): StudyPlanItemEntity {
  return {
    id: row.id,
    studyPlanId: row.studyPlanId,
    kind: row.kind,
    subjectId: row.subjectId,
    topicId: row.topicId,
    lessonId: row.lessonId,
    title: row.title,
    targetDate: row.targetDate?.toISOString() ?? null,
    estimatedMinutes: row.estimatedMinutes,
    order: row.order,
    status: row.status,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export class PrismaStudyPlanItemRepository implements StudyPlanItemRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.studyPlanItem.findFirst({ where: { id, deletedAt: null } });
    return row ? map(row) : null;
  }
  async listByPlanId(studyPlanId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.studyPlanItem.findMany({
        where: { studyPlanId, deletedAt: null },
        orderBy: [{ order: "asc" }, { id: "asc" }],
      })
    ).map(map);
  }
  async createMany(inputs: StudyPlanItemCreateInput[]) {
    const { prisma } = await import("@/server/db/prisma");
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    return inRepositoryTransaction(async () => {
      const rows: StudyPlanItemEntity[] = [];
      for (const { now, targetDate, ...data } of inputs)
        rows.push(
          map(
            await prisma.studyPlanItem.create({
              data: {
                ...data,
                targetDate: targetDate ? new Date(targetDate) : null,
                createdAt: now,
                updatedAt: now,
              },
            }),
          ),
        );
      return rows;
    });
  }
  async update({ id, now, targetDate, ...data }: StudyPlanItemUpdateInput) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.studyPlanItem.update({
        where: { id, deletedAt: null },
        data: {
          ...data,
          ...(targetDate === undefined
            ? {}
            : { targetDate: targetDate ? new Date(targetDate) : null }),
          ...(data.status === undefined
            ? {}
            : { completedAt: data.status === "DONE" ? now : null }),
          updatedAt: now,
        },
      }),
    );
  }
  async reorder(studyPlanId: string, orderedItemIds: string[], now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    return inRepositoryTransaction(async () => {
      await prisma.$queryRaw`SELECT "id" FROM "StudyPlan" WHERE "id"=${studyPlanId} FOR UPDATE`;
      const rows = await prisma.studyPlanItem.findMany({ where: { studyPlanId, deletedAt: null } });
      if (
        new Set(orderedItemIds).size !== rows.length ||
        orderedItemIds.length !== rows.length ||
        rows.some((row) => !orderedItemIds.includes(row.id))
      )
        throw new Error("Reorder requires all plan items exactly once");
      for (let order = 0; order < orderedItemIds.length; order++)
        await prisma.studyPlanItem.update({
          where: { id: orderedItemIds[order]! },
          data: { order, updatedAt: now },
        });
      return this.listByPlanId(studyPlanId);
    });
  }
  async deleteByPlanId(studyPlanId: string) {
    const { prisma } = await import("@/server/db/prisma");
    await prisma.studyPlanItem.deleteMany({ where: { studyPlanId } });
  }
}
