import { inRepositoryTransaction } from "../transaction";
import type { MockExamAttempt as Row } from "@/generated/prisma/client";
import type {
  MockExamAttemptRepository,
  MockExamAttemptEntity,
  MockExamAttemptCreateInput,
  MockExamAttemptFinalizeInput,
  MockExamAttemptExpireInput,
} from "../contracts/mock-exam-attempt-repository";
function map(row: Row): MockExamAttemptEntity {
  return {
    ...row,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export class PrismaMockExamAttemptRepository implements MockExamAttemptRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.mockExamAttempt.findUnique({ where: { id } });
    return row ? map(row) : null;
  }
  async listByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.mockExamAttempt.findMany({ where: { userId }, orderBy: { startedAt: "desc" } })
    ).map(map);
  }
  async create(input: MockExamAttemptCreateInput) {
    return inRepositoryTransaction(async () => {
      const { prisma } = await import("@/server/db/prisma");
      const { now, ...data } = input;
      await prisma.$queryRaw`SELECT "id" FROM "MockExam" WHERE "id" = ${input.mockExamId} FOR UPDATE`;
      await prisma.$queryRaw`SELECT q."id" FROM "Question" q JOIN "MockExamQuestion" eq ON eq."questionId" = q."id" WHERE eq."mockExamId" = ${input.mockExamId} ORDER BY q."id" FOR SHARE OF q`;
      return map(
        await prisma.mockExamAttempt.create({
          data: { ...data, startedAt: now, createdAt: now, updatedAt: now },
        }),
      );
    });
  }
  async finalize(input: MockExamAttemptFinalizeInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { id, expectedVersion, now, ...data } = input;
    const rows = await prisma.mockExamAttempt.updateManyAndReturn({
      where: { id, version: expectedVersion, status: "IN_PROGRESS" },
      data: {
        ...data,
        status: "FINISHED",
        finishedAt: now,
        updatedAt: now,
        version: { increment: 1 },
      },
    });
    return rows[0] ? map(rows[0]) : null;
  }
  async expire(input: MockExamAttemptExpireInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { id, expectedVersion, now } = input;
    const rows = await prisma.mockExamAttempt.updateManyAndReturn({
      where: { id, version: expectedVersion, status: "IN_PROGRESS" },
      data: { status: "EXPIRED", finishedAt: now, updatedAt: now, version: { increment: 1 } },
    });
    return rows[0] ? map(rows[0]) : null;
  }
}
