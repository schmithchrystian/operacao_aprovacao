import type {
  TopicCreateInput,
  TopicEntity,
  TopicRepository,
  TopicUpdateInput,
} from "../contracts/topic-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaTopicRepository implements TopicRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<TopicEntity | null> {
    throw new Error("not implemented: PrismaTopicRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listBySubjectId(_subjectId: string): Promise<TopicEntity[]> {
    throw new Error("not implemented: PrismaTopicRepository.listBySubjectId");
  }

  async list(): Promise<TopicEntity[]> {
    throw new Error("not implemented: PrismaTopicRepository.list");
  }

  async listForAdmin(): Promise<TopicEntity[]> {
    throw new Error("not implemented: PrismaTopicRepository.listForAdmin");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: TopicCreateInput): Promise<TopicEntity> {
    throw new Error("not implemented: PrismaTopicRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: TopicUpdateInput): Promise<TopicEntity> {
    throw new Error("not implemented: PrismaTopicRepository.update");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async softDelete(_id: string, _now: Date): Promise<TopicEntity> {
    throw new Error("not implemented: PrismaTopicRepository.softDelete");
  }
}
