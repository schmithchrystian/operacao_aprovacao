import { ConflictError } from "@/server/errors";
import type {
  QuestionOptionEntity,
  QuestionOptionDraft,
  QuestionOptionRepository,
} from "../contracts/question-option-repository";
import { inRepositoryTransaction } from "../transaction";
const select = {
  id: true,
  questionId: true,
  label: true,
  text: true,
  isCorrect: true,
  order: true,
} as const;
export class PrismaQuestionOptionRepository implements QuestionOptionRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    return prisma.questionOption.findUnique({ where: { id }, select });
  }
  async listByQuestionId(questionId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return prisma.questionOption.findMany({
      where: { questionId },
      select,
      orderBy: { order: "asc" },
    });
  }
  async listByQuestionIds(questionIds: string[]) {
    const { prisma } = await import("@/server/db/prisma");
    return prisma.questionOption.findMany({
      where: { questionId: { in: questionIds } },
      select,
      orderBy: [{ questionId: "asc" }, { order: "asc" }],
    });
  }
  async replaceForQuestion(
    questionId: string,
    drafts: QuestionOptionDraft[],
  ): Promise<QuestionOptionEntity[]> {
    return inRepositoryTransaction(async () => {
      const { prisma } = await import("@/server/db/prisma");
      await prisma.$queryRaw`SELECT "id" FROM "Question" WHERE "id" = ${questionId} FOR UPDATE`;
      if (
        await prisma.question.count({
          where: {
            id: questionId,
            OR: [
              { attempts: { some: {} } },
              { mockExams: { some: { mockExam: { attempts: { some: {} } } } } },
            ],
          },
        })
      )
        throw new ConflictError(
          "Questão já utilizada em uma tentativa. Crie uma nova questão para alterar alternativas.",
        );
      // Referenced alternatives cannot be removed; the FK makes historical answers immutable.
      await prisma.questionOption.deleteMany({ where: { questionId } });
      await prisma.questionOption.createMany({
        data: drafts.map((draft, index) => ({ ...draft, questionId, order: index + 1 })),
      });
      return this.listByQuestionId(questionId);
    });
  }
}
