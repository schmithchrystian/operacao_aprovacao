import type {
  DailyGoalEntity,
  DailyGoalRepository,
  DailyGoalUpsertInput,
} from "../contracts/daily-goal-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`study-tracking` a partir da
 * Fase de banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002). Modelo alvo: `DailyGoal` (`prisma/schema.prisma`), único por `(userId, date)` —
 * a implementação real deve usar `prisma.dailyGoal.upsert` sobre essa chave composta.
 */
export class PrismaDailyGoalRepository implements DailyGoalRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByUserIdAndDate(_userId: string, _date: string): Promise<DailyGoalEntity | null> {
    throw new Error("not implemented: PrismaDailyGoalRepository.findByUserIdAndDate");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<DailyGoalEntity[]> {
    throw new Error("not implemented: PrismaDailyGoalRepository.listByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async upsert(_input: DailyGoalUpsertInput): Promise<DailyGoalEntity> {
    throw new Error("not implemented: PrismaDailyGoalRepository.upsert");
  }
}
