import type {
  WeeklyGoalEntity,
  WeeklyGoalRepository,
  WeeklyGoalUpsertInput,
} from "../contracts/weekly-goal-repository";

/**
 * Implementação mock da meta semanal (ADR-0011, Fase 12). Sem seed inicial — mesmo racional de
 * `./daily-goal-repository.ts`: a linha nasce no primeiro recálculo (`recalculateWeeklyGoal`,
 * `@/server/services/study-tracking/goals.ts`) para o par `(userId, weekStart)`.
 */
let store: WeeklyGoalEntity[] = [];
let sequence = 0;

export class MockWeeklyGoalRepository implements WeeklyGoalRepository {
  async findByUserIdAndWeekStart(userId: string, weekStart: string): Promise<WeeklyGoalEntity | null> {
    return store.find((entry) => entry.userId === userId && entry.weekStart === weekStart) ?? null;
  }

  async listByUserId(userId: string): Promise<WeeklyGoalEntity[]> {
    return store.filter((entry) => entry.userId === userId);
  }

  async upsert(input: WeeklyGoalUpsertInput): Promise<WeeklyGoalEntity> {
    const index = store.findIndex(
      (entry) => entry.userId === input.userId && entry.weekStart === input.weekStart,
    );
    const nowIso = input.now.toISOString();

    const entity: WeeklyGoalEntity = {
      id: index >= 0 ? store[index]!.id : `weekly-goal-mock-${(sequence += 1)}`,
      userId: input.userId,
      weekStart: input.weekStart,
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
export function __resetMockWeeklyGoalStore(): void {
  store = [];
  sequence = 0;
}
