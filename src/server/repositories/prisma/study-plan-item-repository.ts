import type {
  StudyPlanItemCreateInput,
  StudyPlanItemEntity,
  StudyPlanItemRepository,
  StudyPlanItemUpdateInput,
} from "../contracts/study-plan-item-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`study-tracking` a partir da
 * Fase de banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002).
 *
 * PENDÊNCIA (ver `../contracts/study-plan-item-repository.ts`): `StudyPlanItemEntity.kind`
 * ainda não tem coluna própria em `StudyPlanItem` — a implementação real precisa dessa
 * migration (ou de outra forma de derivar `kind`) antes de existir de verdade.
 */
export class PrismaStudyPlanItemRepository implements StudyPlanItemRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<StudyPlanItemEntity | null> {
    throw new Error("not implemented: PrismaStudyPlanItemRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByPlanId(_planId: string): Promise<StudyPlanItemEntity[]> {
    throw new Error("not implemented: PrismaStudyPlanItemRepository.listByPlanId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async createMany(_inputs: StudyPlanItemCreateInput[]): Promise<StudyPlanItemEntity[]> {
    throw new Error("not implemented: PrismaStudyPlanItemRepository.createMany");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: StudyPlanItemUpdateInput): Promise<StudyPlanItemEntity> {
    throw new Error("not implemented: PrismaStudyPlanItemRepository.update");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async reorder(_planId: string, _orderedItemIds: string[], _now: Date): Promise<StudyPlanItemEntity[]> {
    throw new Error("not implemented: PrismaStudyPlanItemRepository.reorder");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async deleteByPlanId(_planId: string): Promise<void> {
    throw new Error("not implemented: PrismaStudyPlanItemRepository.deleteByPlanId");
  }
}
