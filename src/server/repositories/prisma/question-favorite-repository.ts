import type { QuestionFavoriteRepository } from "../contracts/question-favorite-repository";
import { inRepositoryTransaction } from "../transaction";
export class PrismaQuestionFavoriteRepository implements QuestionFavoriteRepository {
  async listByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.questionFavorite.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
    ).map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  }
  async isFavorite(userId: string, questionId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return !!(await prisma.questionFavorite.findUnique({
      where: { userId_questionId: { userId, questionId } },
    }));
  }
  async toggle(userId: string, questionId: string) {
    return inRepositoryTransaction(async () => {
      const { prisma } = await import("@/server/db/prisma");
      await prisma.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const deleted = await prisma.questionFavorite.deleteMany({ where: { userId, questionId } });
      if (deleted.count) return false;
      await prisma.questionFavorite.create({ data: { userId, questionId } });
      return true;
    });
  }
}
