import type { EnrollmentEntity, EnrollmentRepository } from "../contracts/enrollment-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaEnrollmentRepository implements EnrollmentRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByUserAndCourse(_userId: string, _courseId: string): Promise<EnrollmentEntity | null> {
    throw new Error("not implemented: PrismaEnrollmentRepository.findByUserAndCourse");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<EnrollmentEntity[]> {
    throw new Error("not implemented: PrismaEnrollmentRepository.listByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: { userId: string; courseId: string }): Promise<EnrollmentEntity> {
    throw new Error("not implemented: PrismaEnrollmentRepository.create");
  }
}
