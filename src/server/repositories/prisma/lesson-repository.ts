import type { LessonEntity, LessonRepository } from "../contracts/lesson-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaLessonRepository implements LessonRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<LessonEntity | null> {
    throw new Error("not implemented: PrismaLessonRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByModuleId(_moduleId: string): Promise<LessonEntity[]> {
    throw new Error("not implemented: PrismaLessonRepository.listByModuleId");
  }
}
