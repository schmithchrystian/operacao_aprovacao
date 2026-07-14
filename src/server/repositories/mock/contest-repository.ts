import { mockContests } from "@/mocks";
import type {
  ContestCreateInput,
  ContestEntity,
  ContestRepository,
  ContestUpdateInput,
} from "../contracts/contest-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/contests.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo (Fase 17). */
const store = mockStore<ContestEntity[]>("contest", () => [...mockContests]);
const sequence = mockStore<{ value: number }>("contest:sequence", () => ({ value: store.length }));

export class MockContestRepository implements ContestRepository {
  async findById(id: string): Promise<ContestEntity | null> {
    return store.find((contest) => contest.id === id) ?? null;
  }

  async findBySlug(slug: string): Promise<ContestEntity | null> {
    return store.find((contest) => contest.slug === slug) ?? null;
  }

  async list(): Promise<ContestEntity[]> {
    return store.filter((contest) => contest.deletedAt === null);
  }

  async listForAdmin(): Promise<ContestEntity[]> {
    return [...store];
  }

  async create(input: ContestCreateInput): Promise<ContestEntity> {
    sequence.value += 1;
    const created: ContestEntity = {
      id: `contest-mock-${sequence.value}`,
      slug: input.slug,
      name: input.name,
      organizingBoard: input.organizingBoard ?? null,
      description: input.description ?? null,
      deletedAt: null,
    };
    store.push(created);
    return created;
  }

  async update(input: ContestUpdateInput): Promise<ContestEntity> {
    const index = store.findIndex((contest) => contest.id === input.id);
    if (index < 0) {
      throw new Error(`[mocks/contest] Concurso não encontrado: ${input.id}`);
    }
    const current = store[index]!;
    const updated: ContestEntity = {
      ...current,
      name: input.name ?? current.name,
      organizingBoard: input.organizingBoard === undefined ? current.organizingBoard : input.organizingBoard,
      description: input.description === undefined ? current.description : input.description,
    };
    store[index] = updated;
    return updated;
  }

  async softDelete(id: string, now: Date): Promise<ContestEntity> {
    const index = store.findIndex((contest) => contest.id === id);
    if (index < 0) {
      throw new Error(`[mocks/contest] Concurso não encontrado: ${id}`);
    }
    const updated: ContestEntity = { ...store[index]!, deletedAt: now.toISOString() };
    store[index] = updated;
    return updated;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockContestStore(): void {
  store.splice(0, store.length, ...mockContests);
  sequence.value = store.length;
}
