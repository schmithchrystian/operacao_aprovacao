import type {
  StudyPlanCreateInput,
  StudyPlanEntity,
  StudyPlanRepository,
  StudyPlanUpdateInput,
} from "../contracts/study-plan-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`study-tracking` a partir da
 * Fase de banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002).
 */
export class PrismaStudyPlanRepository implements StudyPlanRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<StudyPlanEntity | null> {
    throw new Error("not implemented: PrismaStudyPlanRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findActiveByUserId(_userId: string): Promise<StudyPlanEntity | null> {
    throw new Error("not implemented: PrismaStudyPlanRepository.findActiveByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<StudyPlanEntity[]> {
    throw new Error("not implemented: PrismaStudyPlanRepository.listByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: StudyPlanCreateInput): Promise<StudyPlanEntity> {
    throw new Error("not implemented: PrismaStudyPlanRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: StudyPlanUpdateInput): Promise<StudyPlanEntity> {
    throw new Error("not implemented: PrismaStudyPlanRepository.update");
  }
}
