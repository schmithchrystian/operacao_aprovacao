import type {
  QuestionOptionDraft,
  QuestionOptionEntity,
  QuestionOptionRepository,
} from "../contracts/question-option-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaQuestionOptionRepository implements QuestionOptionRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<QuestionOptionEntity | null> {
    throw new Error("not implemented: PrismaQuestionOptionRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByQuestionId(_questionId: string): Promise<QuestionOptionEntity[]> {
    throw new Error("not implemented: PrismaQuestionOptionRepository.listByQuestionId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByQuestionIds(_questionIds: string[]): Promise<QuestionOptionEntity[]> {
    throw new Error("not implemented: PrismaQuestionOptionRepository.listByQuestionIds");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async replaceForQuestion(_questionId: string, _drafts: QuestionOptionDraft[]): Promise<QuestionOptionEntity[]> {
    throw new Error("not implemented: PrismaQuestionOptionRepository.replaceForQuestion");
  }
}
