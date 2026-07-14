import { mockStudyPlans } from "@/mocks";
import type {
  StudyPlanCreateInput,
  StudyPlanEntity,
  StudyPlanRepository,
  StudyPlanUpdateInput,
} from "../contracts/study-plan-repository";
import { mockStore } from "./mock-store";

/**
 * Implementação mock — seed inicial de `src/mocks/data/study-plan.ts` (ADR-0011). Mesmo
 * padrão de `MockMockExamAttemptRepository` (array mutável em memória + contador de sequência
 * para ids novos, nunca `Math.random()`/`crypto.randomUUID()` — mantém a criação determinística
 * e fácil de testar). Estado via `mockStore` (`./mock-store.ts`) — compartilhado entre
 * instâncias de módulo.
 */
const store = mockStore<StudyPlanEntity[]>("study-plan", () => [...mockStudyPlans]);
const sequence = mockStore<{ value: number }>("study-plan:sequence", () => ({ value: store.length }));

export class MockStudyPlanRepository implements StudyPlanRepository {
  async findById(id: string): Promise<StudyPlanEntity | null> {
    return store.find((plan) => plan.id === id) ?? null;
  }

  async findActiveByUserId(userId: string): Promise<StudyPlanEntity | null> {
    const activePlans = store
      .filter((plan) => plan.userId === userId && plan.status === "ACTIVE")
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return activePlans[0] ?? null;
  }

  async listByUserId(userId: string): Promise<StudyPlanEntity[]> {
    return store.filter((plan) => plan.userId === userId);
  }

  async create(input: StudyPlanCreateInput): Promise<StudyPlanEntity> {
    sequence.value += 1;
    const nowIso = input.now.toISOString();
    const plan: StudyPlanEntity = {
      id: `study-plan-mock-${sequence.value}`,
      userId: input.userId,
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "ACTIVE",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    store.push(plan);
    return plan;
  }

  async update(input: StudyPlanUpdateInput): Promise<StudyPlanEntity> {
    const index = store.findIndex((plan) => plan.id === input.id);
    if (index < 0) {
      throw new Error(`[mocks/study-plan] Plano não encontrado: ${input.id}`);
    }
    const current = store[index]!;
    const updated: StudyPlanEntity = {
      ...current,
      title: input.title ?? current.title,
      startDate: input.startDate ?? current.startDate,
      endDate: input.endDate === undefined ? current.endDate : input.endDate,
      status: input.status ?? current.status,
      updatedAt: input.now.toISOString(),
    };
    store[index] = updated;
    return updated;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockStudyPlanStore(): void {
  store.splice(0, store.length, ...mockStudyPlans);
  sequence.value = store.length;
}
