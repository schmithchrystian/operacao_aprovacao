import type {
  SubjectCreateInput,
  SubjectEntity,
  SubjectRepository,
  SubjectUpdateInput,
} from "../contracts/subject-repository";

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

  async listForAdmin(): Promise<SubjectEntity[]> {
    throw new Error("not implemented: PrismaSubjectRepository.listForAdmin");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: SubjectCreateInput): Promise<SubjectEntity> {
    throw new Error("not implemented: PrismaSubjectRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: SubjectUpdateInput): Promise<SubjectEntity> {
    throw new Error("not implemented: PrismaSubjectRepository.update");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async softDelete(_id: string, _now: Date): Promise<SubjectEntity> {
    throw new Error("not implemented: PrismaSubjectRepository.softDelete");
  }
}
