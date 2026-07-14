import type { QuestionFavoriteEntity, QuestionFavoriteRepository } from "../contracts/question-favorite-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaQuestionFavoriteRepository implements QuestionFavoriteRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<QuestionFavoriteEntity[]> {
    throw new Error("not implemented: PrismaQuestionFavoriteRepository.listByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async isFavorite(_userId: string, _questionId: string): Promise<boolean> {
    throw new Error("not implemented: PrismaQuestionFavoriteRepository.isFavorite");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async toggle(_userId: string, _questionId: string): Promise<boolean> {
    throw new Error("not implemented: PrismaQuestionFavoriteRepository.toggle");
  }
}
