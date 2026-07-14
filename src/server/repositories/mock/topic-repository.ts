import { mockTopics } from "@/mocks";
import type {
  TopicCreateInput,
  TopicEntity,
  TopicRepository,
  TopicUpdateInput,
} from "../contracts/topic-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/topics.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo (Fase 17 — CRUD
 *  administrativo). */
const store = mockStore<TopicEntity[]>("topic", () => [...mockTopics]);
const sequence = mockStore<{ value: number }>("topic:sequence", () => ({ value: store.length }));

export class MockTopicRepository implements TopicRepository {
  async findById(id: string): Promise<TopicEntity | null> {
    return store.find((topic) => topic.id === id) ?? null;
  }

  async listBySubjectId(subjectId: string): Promise<TopicEntity[]> {
    return store.filter((topic) => topic.subjectId === subjectId && topic.deletedAt === null);
  }

  async list(): Promise<TopicEntity[]> {
    return store.filter((topic) => topic.deletedAt === null);
  }

  async listForAdmin(): Promise<TopicEntity[]> {
    return [...store];
  }

  async create(input: TopicCreateInput): Promise<TopicEntity> {
    sequence.value += 1;
    const created: TopicEntity = {
      id: `topic-mock-${sequence.value}`,
      subjectId: input.subjectId,
      name: input.name,
      deletedAt: null,
    };
    store.push(created);
    return created;
  }

  async update(input: TopicUpdateInput): Promise<TopicEntity> {
    const index = store.findIndex((topic) => topic.id === input.id);
    if (index < 0) {
      throw new Error(`[mocks/topic] Assunto não encontrado: ${input.id}`);
    }
    const current = store[index]!;
    const updated: TopicEntity = {
      ...current,
      subjectId: input.subjectId ?? current.subjectId,
      name: input.name ?? current.name,
    };
    store[index] = updated;
    return updated;
  }

  async softDelete(id: string, now: Date): Promise<TopicEntity> {
    const index = store.findIndex((topic) => topic.id === id);
    if (index < 0) {
      throw new Error(`[mocks/topic] Assunto não encontrado: ${id}`);
    }
    const updated: TopicEntity = { ...store[index]!, deletedAt: now.toISOString() };
    store[index] = updated;
    return updated;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockTopicStore(): void {
  store.splice(0, store.length, ...mockTopics);
  sequence.value = store.length;
}
