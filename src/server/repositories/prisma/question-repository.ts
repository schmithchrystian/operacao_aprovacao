import type { QuestionEntity, QuestionFilter, QuestionRepository } from "../contracts/question-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaQuestionRepository implements QuestionRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<QuestionEntity | null> {
    throw new Error("not implemented: PrismaQuestionRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByIds(_ids: string[]): Promise<QuestionEntity[]> {
    throw new Error("not implemented: PrismaQuestionRepository.findByIds");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async list(_filter?: QuestionFilter): Promise<QuestionEntity[]> {
    throw new Error("not implemented: PrismaQuestionRepository.list");
  }
}
