import type {
  WeeklyGoalEntity,
  WeeklyGoalRepository,
  WeeklyGoalUpsertInput,
} from "../contracts/weekly-goal-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`study-tracking` a partir da
 * Fase de banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002). Modelo alvo: `WeeklyGoal` (`prisma/schema.prisma`), único por `(userId, weekStart)`
 * — a implementação real deve usar `prisma.weeklyGoal.upsert` sobre essa chave composta.
 */
export class PrismaWeeklyGoalRepository implements WeeklyGoalRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByUserIdAndWeekStart(_userId: string, _weekStart: string): Promise<WeeklyGoalEntity | null> {
    throw new Error("not implemented: PrismaWeeklyGoalRepository.findByUserIdAndWeekStart");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<WeeklyGoalEntity[]> {
    throw new Error("not implemented: PrismaWeeklyGoalRepository.listByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async upsert(_input: WeeklyGoalUpsertInput): Promise<WeeklyGoalEntity> {
    throw new Error("not implemented: PrismaWeeklyGoalRepository.upsert");
  }
}
