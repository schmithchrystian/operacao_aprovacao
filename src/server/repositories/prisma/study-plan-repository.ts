import type { StudyPlan as Row } from "@/generated/prisma/client";
import type {
  StudyPlanEntity,
  StudyPlanRepository,
  StudyPlanCreateInput,
  StudyPlanUpdateInput,
} from "../contracts/study-plan-repository";
function map(row: Row): StudyPlanEntity {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate?.toISOString() ?? null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export class PrismaStudyPlanRepository implements StudyPlanRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.studyPlan.findFirst({ where: { id, deletedAt: null } });
    return row ? map(row) : null;
  }
  async findActiveByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.studyPlan.findFirst({
      where: { userId, status: "ACTIVE", deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
    return row ? map(row) : null;
  }
  async listByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.studyPlan.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      })
    ).map(map);
  }
  async create(input: StudyPlanCreateInput) {
    const { prisma, RetryableTransactionConflict } = await import("@/server/db/prisma");
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    return inRepositoryTransaction(async () => {
      await prisma.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${input.userId} FOR UPDATE`;
      const existing = await prisma.studyPlan.findFirst({
        where: { userId: input.userId, status: "ACTIVE", deletedAt: null },
      });
      if (existing) return map(existing);
      const { now, startDate, endDate, ...data } = input;
      try {
        return map(
          await prisma.studyPlan.create({
            data: {
              ...data,
              startDate: new Date(startDate),
              endDate: endDate ? new Date(endDate) : null,
              createdAt: now,
              updatedAt: now,
            },
          }),
        );
      } catch (error) {
        // PostgreSQL may report the partial unique index as P2002 instead of 40001.
        // Retry the entire unit of work, including callers, with a fresh snapshot.
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
          throw new RetryableTransactionConflict("Concurrent active study plan creation", {
            cause: error,
          });
        }
        throw error;
      }
    });
  }
  async update({ id, now, startDate, endDate, ...data }: StudyPlanUpdateInput) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.studyPlan.update({
        where: { id, deletedAt: null },
        data: {
          ...data,
          ...(startDate === undefined ? {} : { startDate: new Date(startDate) }),
          ...(endDate === undefined
            ? {}
            : { endDate: endDate === null ? null : new Date(endDate) }),
          updatedAt: now,
        },
      }),
    );
  }
}
