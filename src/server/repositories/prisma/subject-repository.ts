import type { SubjectEntity, SubjectRepository } from "../contracts/subject-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaSubjectRepository implements SubjectRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<SubjectEntity | null> {
    throw new Error("not implemented: PrismaSubjectRepository.findById");
  }

  async list(): Promise<SubjectEntity[]> {
    throw new Error("not implemented: PrismaSubjectRepository.list");
  }
}
