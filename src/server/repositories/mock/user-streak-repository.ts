import type {
  UserStreakEntity,
  UserStreakRepository,
  UserStreakUpsertInput,
} from "../contracts/user-streak-repository";

/**
 * Implementação mock da sequência de estudo (ADR-0011, Fase 12). Sem seed inicial — mesma
 * escolha de `MockStudySessionRepository`/`MockRankingScoreRepository`: a linha só passa a
 * existir quando `recalculateStreak` (`@/server/services/study-tracking/streak`) roda pela
 * primeira vez para o usuário, a partir de `StudySession`s reais. Isso significa que, num
 * processo mock "frio" (sem heartbeats registrados ainda para os usuários de demonstração), o
 * streak exibido no dashboard/conquistas é honestamente `0` em vez de um número fixo
 * divorciado da atividade real — ver nota em `@/server/services/study-tracking/streak.ts`.
 */
let store = new Map<string, UserStreakEntity>();

export class MockUserStreakRepository implements UserStreakRepository {
  async findByUserId(userId: string): Promise<UserStreakEntity | null> {
    return store.get(userId) ?? null;
  }

  async upsert(input: UserStreakUpsertInput): Promise<UserStreakEntity> {
    const entity: UserStreakEntity = {
      userId: input.userId,
      currentStreak: input.currentStreak,
      longestStreak: input.longestStreak,
      lastActiveDate: input.lastActiveDate,
      freezesAvailable: input.freezesAvailable,
      updatedAt: input.now.toISOString(),
    };
    store.set(input.userId, entity);
    return entity;
  }
}

/** Uso exclusivo de testes — esvazia o store mock (não há seed inicial). */
export function __resetMockUserStreakStore(): void {
  store = new Map();
}
