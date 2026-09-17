import type { QuestionAttempt as Row } from "@/generated/prisma/client";
import type {
  QuestionAttemptRepository,
  QuestionAttemptEntity,
  QuestionAttemptCreateInput,
} from "../contracts/question-attempt-repository";
function map(row: Row): QuestionAttemptEntity {
  return {
    id: row.id,
    userId: row.userId,
    questionId: row.questionId,
    mockExamAttemptId: row.mockExamAttemptId,
    selectedOptionId: row.selectedOptionId,
    isCorrect: row.isCorrect,
    timeSpentSeconds: row.timeSpentSeconds,
    answeredAt: row.answeredAt.toISOString(),
  };
}
export class PrismaQuestionAttemptRepository implements QuestionAttemptRepository {
  async listByMockExamAttemptId(mockExamAttemptId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.questionAttempt.findMany({
        where: { mockExamAttemptId },
        orderBy: { answeredAt: "asc" },
      })
    ).map(map);
  }
  async listByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.questionAttempt.findMany({ where: { userId }, orderBy: { answeredAt: "desc" } })
    ).map(map);
  }
  async upsertForMockExamAttempt(input: QuestionAttemptCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { now, ...rest } = input;
    const data = { ...rest, answeredAt: now };
    if (input.mockExamAttemptId === null) return map(await prisma.questionAttempt.create({ data }));
    return map(
      await prisma.questionAttempt.upsert({
        where: {
          mockExamAttemptId_questionId: {
            mockExamAttemptId: input.mockExamAttemptId,
            questionId: input.questionId,
          },
        },
        create: data,
        update: data,
      }),
    );
  }
}
