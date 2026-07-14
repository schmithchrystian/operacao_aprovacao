import { mockAchievements } from "@/mocks";
import type {
  AchievementCreateInput,
  AchievementEntity,
  AchievementRepository,
  AchievementUpdateInput,
} from "../contracts/achievement-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/achievements.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo (Fase 17). */
const store = mockStore<AchievementEntity[]>("achievement", () => [...mockAchievements]);
const sequence = mockStore<{ value: number }>("achievement:sequence", () => ({ value: store.length }));

export class MockAchievementRepository implements AchievementRepository {
  async findById(id: string): Promise<AchievementEntity | null> {
    return store.find((achievement) => achievement.id === id) ?? null;
  }

  async findByKey(key: string): Promise<AchievementEntity | null> {
    return store.find((achievement) => achievement.key === key) ?? null;
  }

  async list(): Promise<AchievementEntity[]> {
    return store.filter((achievement) => achievement.deletedAt === null);
  }

  async listForAdmin(): Promise<AchievementEntity[]> {
    return [...store];
  }

  async create(input: AchievementCreateInput): Promise<AchievementEntity> {
    sequence.value += 1;
    const created: AchievementEntity = {
      id: `achievement-mock-${sequence.value}`,
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
      criteria: input.criteria ?? null,
      points: input.points ?? 0,
      deletedAt: null,
    };
    store.push(created);
    return created;
  }

  async update(input: AchievementUpdateInput): Promise<AchievementEntity> {
    const index = store.findIndex((achievement) => achievement.id === input.id);
    if (index < 0) {
      throw new Error(`[mocks/achievement] Conquista não encontrada: ${input.id}`);
    }
    const current = store[index]!;
    const updated: AchievementEntity = {
      ...current,
      name: input.name ?? current.name,
      description: input.description === undefined ? current.description : input.description,
      icon: input.icon === undefined ? current.icon : input.icon,
      criteria: input.criteria === undefined ? current.criteria : input.criteria,
      points: input.points ?? current.points,
    };
    store[index] = updated;
    return updated;
  }

  async softDelete(id: string, now: Date): Promise<AchievementEntity> {
    const index = store.findIndex((achievement) => achievement.id === id);
    if (index < 0) {
      throw new Error(`[mocks/achievement] Conquista não encontrada: ${id}`);
    }
    const updated: AchievementEntity = { ...store[index]!, deletedAt: now.toISOString() };
    store[index] = updated;
    return updated;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockAchievementStore(): void {
  store.splice(0, store.length, ...mockAchievements);
  sequence.value = store.length;
}
