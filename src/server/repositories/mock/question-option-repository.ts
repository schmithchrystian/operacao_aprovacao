import { mockQuestionOptions } from "@/mocks";
import type { QuestionOptionEntity, QuestionOptionRepository } from "../contracts/question-option-repository";

/** Implementação mock — lê de `src/mocks/data/questions.ts` (ADR-0011). */
export class MockQuestionOptionRepository implements QuestionOptionRepository {
  async findById(id: string): Promise<QuestionOptionEntity | null> {
    return mockQuestionOptions.find((option) => option.id === id) ?? null;
  }

  async listByQuestionId(questionId: string): Promise<QuestionOptionEntity[]> {
    return mockQuestionOptions
      .filter((option) => option.questionId === questionId)
      .sort((a, b) => a.order - b.order);
  }

  async listByQuestionIds(questionIds: string[]): Promise<QuestionOptionEntity[]> {
    const idSet = new Set(questionIds);
    return mockQuestionOptions
      .filter((option) => idSet.has(option.questionId))
      .sort((a, b) => a.questionId.localeCompare(b.questionId) || a.order - b.order);
  }
}
