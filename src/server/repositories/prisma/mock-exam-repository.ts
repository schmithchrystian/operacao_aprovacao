import { ConflictError } from "@/server/errors";
import type { Prisma } from "@/generated/prisma/client";
import type {
  MockExamRepository,
  MockExamEntity,
  MockExamCreateInput,
  MockExamCatalogCreateInput,
  MockExamUpdateInput,
} from "../contracts/mock-exam-repository";
import { inRepositoryTransaction } from "../transaction";
const include = { questions: { orderBy: { order: "asc" as const } } };
type Row = Prisma.MockExamGetPayload<{ include: typeof include }>;
function map(row: Row): MockExamEntity {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    durationMinutes: row.durationMinutes,
    status: row.status,
    questionIds: row.questions.map((q) => q.questionId),
    createdById: row.createdById,
    isPersonal: row.isPersonal,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}
export class PrismaMockExamRepository implements MockExamRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.mockExam.findUnique({ where: { id }, include });
    return row ? map(row) : null;
  }
  async list() {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.mockExam.findMany({
        where: { isPersonal: false, status: "PUBLISHED", deletedAt: null },
        include,
        orderBy: { createdAt: "desc" },
      })
    ).map(map);
  }
  async listForAdmin() {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.mockExam.findMany({
        where: { isPersonal: false },
        include,
        orderBy: { createdAt: "desc" },
      })
    ).map(map);
  }
  private async insert(input: MockExamCreateInput, isPersonal: boolean) {
    const { prisma } = await import("@/server/db/prisma");
    const { now, questionIds, ...data } = input;
    return map(
      await prisma.mockExam.create({
        data: {
          ...data,
          isPersonal,
          createdAt: now,
          updatedAt: now,
          questions: {
            create: questionIds.map((questionId, index) => ({ questionId, order: index + 1 })),
          },
        },
        include,
      }),
    );
  }
  async create(input: MockExamCreateInput) {
    return this.insert(input, true);
  }
  async createCatalog(input: MockExamCatalogCreateInput) {
    return this.insert(input, false);
  }
  async update(input: MockExamUpdateInput) {
    return inRepositoryTransaction(async () => {
      const { prisma } = await import("@/server/db/prisma");
      const { id, now, questionIds, ...data } = input;
      await prisma.$queryRaw`SELECT "id" FROM "MockExam" WHERE "id" = ${id} FOR UPDATE`;
      if (
        (questionIds !== undefined || Object.keys(data).some((key) => key !== "status")) &&
        (await prisma.mockExamAttempt.count({ where: { mockExamId: id } }))
      )
        throw new ConflictError(
          "Simulado já iniciado. Crie um novo simulado para alterar conteúdo ou duração.",
        );
      return map(
        await prisma.mockExam.update({
          where: { id, isPersonal: false },
          data: {
            ...data,
            updatedAt: now,
            ...(questionIds
              ? {
                  questions: {
                    deleteMany: {},
                    create: questionIds.map((questionId, index) => ({
                      questionId,
                      order: index + 1,
                    })),
                  },
                }
              : {}),
          },
          include,
        }),
      );
    });
  }
  async softDelete(id: string, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.mockExam.update({
        where: { id, isPersonal: false },
        data: { deletedAt: now, updatedAt: now },
        include,
      }),
    );
  }
}
