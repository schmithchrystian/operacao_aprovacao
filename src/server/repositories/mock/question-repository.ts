import { mockQuestions } from "@/mocks";
import type {
  QuestionCreateInput,
  QuestionEntity,
  QuestionFilter,
  QuestionRepository,
  QuestionUpdateInput,
} from "../contracts/question-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/questions.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo (Fase 17 — CRUD
 *  administrativo). */
const store = mockStore<QuestionEntity[]>("question", () => [...mockQuestions]);
const sequence = mockStore<{ value: number }>("question:sequence", () => ({ value: store.length }));

export class MockQuestionRepository implements QuestionRepository {
  async findById(id: string): Promise<QuestionEntity | null> {
    return store.find((question) => question.id === id) ?? null;
  }

  async findByIds(ids: string[]): Promise<QuestionEntity[]> {
    const idSet = new Set(ids);
    return store.filter((question) => idSet.has(question.id));
  }

  async list(filter: QuestionFilter = {}): Promise<QuestionEntity[]> {
    const status = filter.status ?? "PUBLISHED";
    return store.filter((question) => {
      if (question.deletedAt !== null) return false;
      if (question.status !== status) return false;
      if (filter.subjectId && question.subjectId !== filter.subjectId) return false;
      if (filter.subjectIds && !filter.subjectIds.includes(question.subjectId)) return false;
      if (filter.topicId && question.topicId !== filter.topicId) return false;
      if (filter.board && question.board !== filter.board) return false;
      if (filter.difficulty && question.difficulty !== filter.difficulty) return false;
      return true;
    });
  }

  async listForAdmin(): Promise<QuestionEntity[]> {
    return [...store];
  }

  async create(input: QuestionCreateInput): Promise<QuestionEntity> {
    sequence.value += 1;
    const created: QuestionEntity = {
      id: `question-mock-${sequence.value}`,
      statement: input.statement,
      subjectId: input.subjectId,
      topicId: input.topicId,
      board: input.board,
      difficulty: input.difficulty,
      explanation: input.explanation,
      status: "DRAFT",
      createdAt: input.now.toISOString(),
      deletedAt: null,
    };
    store.push(created);
    return created;
  }

  async update(input: QuestionUpdateInput): Promise<QuestionEntity> {
    const index = store.findIndex((question) => question.id === input.id);
    if (index < 0) {
      throw new Error(`[mocks/question] Questão não encontrada: ${input.id}`);
    }
    const current = store[index]!;
    const updated: QuestionEntity = {
      ...current,
      statement: input.statement ?? current.statement,
      subjectId: input.subjectId ?? current.subjectId,
      topicId: input.topicId === undefined ? current.topicId : input.topicId,
      board: input.board === undefined ? current.board : input.board,
      difficulty: input.difficulty ?? current.difficulty,
      explanation: input.explanation === undefined ? current.explanation : input.explanation,
      status: input.status ?? current.status,
    };
    store[index] = updated;
    return updated;
  }

  async softDelete(id: string, now: Date): Promise<QuestionEntity> {
    const index = store.findIndex((question) => question.id === id);
    if (index < 0) {
      throw new Error(`[mocks/question] Questão não encontrada: ${id}`);
    }
    const updated: QuestionEntity = { ...store[index]!, deletedAt: now.toISOString() };
    store[index] = updated;
    return updated;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockQuestionStore(): void {
  store.splice(0, store.length, ...mockQuestions);
  sequence.value = store.length;
}
