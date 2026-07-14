import { mockQuestions } from "@/mocks";
import type { QuestionEntity, QuestionFilter, QuestionRepository } from "../contracts/question-repository";

/** Implementação mock — lê de `src/mocks/data/questions.ts` (ADR-0011). */
export class MockQuestionRepository implements QuestionRepository {
  async findById(id: string): Promise<QuestionEntity | null> {
    return mockQuestions.find((question) => question.id === id) ?? null;
  }

  async findByIds(ids: string[]): Promise<QuestionEntity[]> {
    const idSet = new Set(ids);
    return mockQuestions.filter((question) => idSet.has(question.id));
  }

  async list(filter: QuestionFilter = {}): Promise<QuestionEntity[]> {
    const status = filter.status ?? "PUBLISHED";
    return mockQuestions.filter((question) => {
      if (question.status !== status) return false;
      if (filter.subjectId && question.subjectId !== filter.subjectId) return false;
      if (filter.subjectIds && !filter.subjectIds.includes(question.subjectId)) return false;
      if (filter.topicId && question.topicId !== filter.topicId) return false;
      if (filter.board && question.board !== filter.board) return false;
      if (filter.difficulty && question.difficulty !== filter.difficulty) return false;
      return true;
    });
  }
}
