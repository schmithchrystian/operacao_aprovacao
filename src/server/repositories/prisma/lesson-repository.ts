import type {
  LessonCreateInput,
  LessonEntity,
  LessonRepository,
  LessonUpdateInput,
} from "../contracts/lesson-repository";

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByModuleIdForAdmin(_moduleId: string): Promise<LessonEntity[]> {
    throw new Error("not implemented: PrismaLessonRepository.listByModuleIdForAdmin");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: LessonCreateInput): Promise<LessonEntity> {
    throw new Error("not implemented: PrismaLessonRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: LessonUpdateInput): Promise<LessonEntity> {
    throw new Error("not implemented: PrismaLessonRepository.update");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async softDelete(_id: string, _now: Date): Promise<LessonEntity> {
    throw new Error("not implemented: PrismaLessonRepository.softDelete");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async reorder(_moduleId: string, _orderedLessonIds: string[], _now: Date): Promise<LessonEntity[]> {
    throw new Error("not implemented: PrismaLessonRepository.reorder");
  }
}
