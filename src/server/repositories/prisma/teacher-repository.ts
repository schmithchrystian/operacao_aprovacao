import type {
  TeacherCreateInput,
  TeacherEntity,
  TeacherRepository,
  TeacherUpdateInput,
} from "../contracts/teacher-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaTeacherRepository implements TeacherRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<TeacherEntity | null> {
    throw new Error("not implemented: PrismaTeacherRepository.findById");
  }

  async list(): Promise<TeacherEntity[]> {
    throw new Error("not implemented: PrismaTeacherRepository.list");
  }

  async listForAdmin(): Promise<TeacherEntity[]> {
    throw new Error("not implemented: PrismaTeacherRepository.listForAdmin");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: TeacherCreateInput): Promise<TeacherEntity> {
    throw new Error("not implemented: PrismaTeacherRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: TeacherUpdateInput): Promise<TeacherEntity> {
    throw new Error("not implemented: PrismaTeacherRepository.update");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async softDelete(_id: string, _now: Date): Promise<TeacherEntity> {
    throw new Error("not implemented: PrismaTeacherRepository.softDelete");
  }
}
