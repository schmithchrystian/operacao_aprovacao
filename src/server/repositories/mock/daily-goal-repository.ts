import type {
  DailyGoalEntity,
  DailyGoalRepository,
  DailyGoalUpsertInput,
} from "../contracts/daily-goal-repository";

/**
 * Implementação mock da meta diária (ADR-0011, Fase 12). Sem seed inicial — mesmo racional de
 * `./user-streak-repository.ts`: a linha nasce no primeiro recálculo (`recalculateDailyGoal`,
 * `@/server/services/study-tracking/goals.ts`) para o par `(userId, date)`.
 */
let store: DailyGoalEntity[] = [];
let sequence = 0;

export class MockDailyGoalRepository implements DailyGoalRepository {
  async findByUserIdAndDate(userId: string, date: string): Promise<DailyGoalEntity | null> {
    return store.find((entry) => entry.userId === userId && entry.date === date) ?? null;
  }

  async listByUserId(userId: string): Promise<DailyGoalEntity[]> {
    return store.filter((entry) => entry.userId === userId);
  }

  async upsert(input: DailyGoalUpsertInput): Promise<DailyGoalEntity> {
    const index = store.findIndex((entry) => entry.userId === input.userId && entry.date === input.date);
    const nowIso = input.now.toISOString();

    const entity: DailyGoalEntity = {
      id: index >= 0 ? store[index]!.id : `daily-goal-mock-${(sequence += 1)}`,
      userId: input.userId,
      date: input.date,
      targetMinutes: input.targetMinutes,
      targetPoints: input.targetPoints,
      achieved: input.achieved,
      achievedAt: input.achievedAt,
      createdAt: index >= 0 ? store[index]!.createdAt : nowIso,
      updatedAt: nowIso,
    };

    if (index >= 0) {
      store[index] = entity;
    } else {
      store.push(entity);
    }
    return entity;
  }
}

/** Uso exclusivo de testes — esvazia o store mock (não há seed inicial). */
export function __resetMockDailyGoalStore(): void {
  store = [];
  sequence = 0;
}
