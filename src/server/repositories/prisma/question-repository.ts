import { ConflictError } from "@/server/errors";
import { inRepositoryTransaction } from "../transaction";
import type { Question as Row } from "@/generated/prisma/client";
import type {
  QuestionCreateInput,
  QuestionEntity,
  QuestionFilter,
  QuestionRepository,
  QuestionUpdateInput,
} from "../contracts/question-repository";
function map(row: Row): QuestionEntity {
  return {
    id: row.id,
    statement: row.statement,
    subjectId: row.subjectId,
    topicId: row.topicId,
    board: row.board,
    difficulty: row.difficulty,
    explanation: row.explanation,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}
export class PrismaQuestionRepository implements QuestionRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.question.findUnique({ where: { id } });
    return row ? map(row) : null;
  }
  async findByIds(ids: string[]) {
    const { prisma } = await import("@/server/db/prisma");
    return (await prisma.question.findMany({ where: { id: { in: ids } } })).map(map);
  }
  async list(filter: QuestionFilter = {}) {
    const { prisma } = await import("@/server/db/prisma");
    const { subjectIds, subjectId, ...rest } = filter;
    return (
      await prisma.question.findMany({
        where: {
          ...rest,
          status: filter.status ?? "PUBLISHED",
          deletedAt: null,
          AND: [
            ...(subjectId ? [{ subjectId }] : []),
            ...(subjectIds ? [{ subjectId: { in: subjectIds } }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
      })
    ).map(map);
  }
  async listForAdmin() {
    const { prisma } = await import("@/server/db/prisma");
    return (await prisma.question.findMany({ orderBy: { createdAt: "desc" } })).map(map);
  }
  async create(input: QuestionCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { now, ...data } = input;
    return map(await prisma.question.create({ data: { ...data, createdAt: now, updatedAt: now } }));
  }
  async update(input: QuestionUpdateInput) {
    return inRepositoryTransaction(async () => {
      const { prisma } = await import("@/server/db/prisma");
      const { id, now, ...data } = input;
      await prisma.$queryRaw`SELECT "id" FROM "Question" WHERE "id" = ${id} FOR UPDATE`;
      const changesContent = Object.keys(data).some((key) => key !== "status");
      if (
        changesContent &&
        (await prisma.question.count({
          where: {
            id,
            OR: [
              { attempts: { some: {} } },
              { mockExams: { some: { mockExam: { attempts: { some: {} } } } } },
            ],
          },
        }))
      )
        throw new ConflictError(
          "Questão já utilizada em uma tentativa. Crie uma nova questão para alterar o conteúdo.",
        );
      return map(
        await prisma.question.update({ where: { id }, data: { ...data, updatedAt: now } }),
      );
    });
  }
  async softDelete(id: string, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.question.update({ where: { id }, data: { deletedAt: now, updatedAt: now } }),
    );
  }
}
