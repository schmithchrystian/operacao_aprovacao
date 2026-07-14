import type {
  ModuleCreateInput,
  ModuleEntity,
  ModuleRepository,
  ModuleUpdateInput,
} from "../contracts/module-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaModuleRepository implements ModuleRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<ModuleEntity | null> {
    throw new Error("not implemented: PrismaModuleRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByCourseId(_courseId: string): Promise<ModuleEntity[]> {
    throw new Error("not implemented: PrismaModuleRepository.listByCourseId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByCourseIdForAdmin(_courseId: string): Promise<ModuleEntity[]> {
    throw new Error("not implemented: PrismaModuleRepository.listByCourseIdForAdmin");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: ModuleCreateInput): Promise<ModuleEntity> {
    throw new Error("not implemented: PrismaModuleRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: ModuleUpdateInput): Promise<ModuleEntity> {
    throw new Error("not implemented: PrismaModuleRepository.update");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async softDelete(_id: string, _now: Date): Promise<ModuleEntity> {
    throw new Error("not implemented: PrismaModuleRepository.softDelete");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async reorder(_courseId: string, _orderedModuleIds: string[], _now: Date): Promise<ModuleEntity[]> {
    throw new Error("not implemented: PrismaModuleRepository.reorder");
  }
}
