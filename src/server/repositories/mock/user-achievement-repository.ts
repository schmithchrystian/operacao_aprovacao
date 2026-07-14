import { mockUserAchievementSeed } from "@/mocks";
import type {
  UserAchievementEntity,
  UserAchievementRepository,
} from "../contracts/user-achievement-repository";
import { mockStore } from "./mock-store";

/**
 * Implementação mock de conquistas desbloqueadas (ADR-0011, Fase 8). `unlock()` é
 * IDEMPOTENTE: repetir `(userId, achievementKey)` nunca cria uma segunda linha nem altera o
 * `unlockedAt` já gravado (mesma garantia de `UserAchievement @@id([userId, achievementId])`
 * no schema real). Estado via `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias
 * de módulo, condição necessária para a idempotência valer entre Route Handlers/Server
 * Actions/Server Components distintos.
 */
const store = mockStore<UserAchievementEntity[]>("user-achievement", () => [...mockUserAchievementSeed]);

export class MockUserAchievementRepository implements UserAchievementRepository {
  async listByUserId(userId: string): Promise<UserAchievementEntity[]> {
    return store.filter((entry) => entry.userId === userId);
  }

  async findByUserAndKey(userId: string, achievementKey: string): Promise<UserAchievementEntity | null> {
    return (
      store.find((entry) => entry.userId === userId && entry.achievementKey === achievementKey) ?? null
    );
  }

  async unlock(userId: string, achievementKey: string, now: Date): Promise<UserAchievementEntity> {
    const existing = await this.findByUserAndKey(userId, achievementKey);
    if (existing) {
      return existing;
    }

    const entry: UserAchievementEntity = { userId, achievementKey, unlockedAt: now.toISOString() };
    store.push(entry);
    return entry;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockUserAchievementStore(): void {
  store.splice(0, store.length, ...mockUserAchievementSeed);
}
