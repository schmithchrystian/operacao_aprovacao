import type { TopicEntity, TopicRepository } from "../contracts/topic-repository";

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
}
