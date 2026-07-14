import { mockQuestionOptions } from "@/mocks";
import type {
  QuestionOptionDraft,
  QuestionOptionEntity,
  QuestionOptionRepository,
} from "../contracts/question-option-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/questions.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo (Fase 17 — CRUD
 *  administrativo). */
const store = mockStore<QuestionOptionEntity[]>("question-option", () => [...mockQuestionOptions]);
const sequence = mockStore<{ value: number }>("question-option:sequence", () => ({ value: store.length }));

export class MockQuestionOptionRepository implements QuestionOptionRepository {
  async findById(id: string): Promise<QuestionOptionEntity | null> {
    return store.find((option) => option.id === id) ?? null;
  }

  async listByQuestionId(questionId: string): Promise<QuestionOptionEntity[]> {
    return store
      .filter((option) => option.questionId === questionId)
      .sort((a, b) => a.order - b.order);
  }

  async listByQuestionIds(questionIds: string[]): Promise<QuestionOptionEntity[]> {
    const idSet = new Set(questionIds);
    return store
      .filter((option) => idSet.has(option.questionId))
      .sort((a, b) => a.questionId.localeCompare(b.questionId) || a.order - b.order);
  }

  async replaceForQuestion(questionId: string, drafts: QuestionOptionDraft[]): Promise<QuestionOptionEntity[]> {
    const remaining = store.filter((option) => option.questionId !== questionId);
    const created: QuestionOptionEntity[] = drafts.map((draft, index) => {
      sequence.value += 1;
      return {
        id: `question-option-mock-${sequence.value}`,
        questionId,
        label: draft.label,
        text: draft.text,
        isCorrect: draft.isCorrect,
        order: index + 1,
      };
    });
    store.splice(0, store.length, ...remaining, ...created);
    return created;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockQuestionOptionStore(): void {
  store.splice(0, store.length, ...mockQuestionOptions);
  sequence.value = store.length;
}
