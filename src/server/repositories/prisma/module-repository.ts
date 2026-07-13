import type { ModuleEntity, ModuleRepository } from "../contracts/module-repository";

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
}
