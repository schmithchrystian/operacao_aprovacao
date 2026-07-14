import type {
  QuestionCreateInput,
  QuestionEntity,
  QuestionFilter,
  QuestionRepository,
  QuestionUpdateInput,
} from "../contracts/question-repository";

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

  async listForAdmin(): Promise<QuestionEntity[]> {
    throw new Error("not implemented: PrismaQuestionRepository.listForAdmin");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: QuestionCreateInput): Promise<QuestionEntity> {
    throw new Error("not implemented: PrismaQuestionRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: QuestionUpdateInput): Promise<QuestionEntity> {
    throw new Error("not implemented: PrismaQuestionRepository.update");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async softDelete(_id: string, _now: Date): Promise<QuestionEntity> {
    throw new Error("not implemented: PrismaQuestionRepository.softDelete");
  }
}
