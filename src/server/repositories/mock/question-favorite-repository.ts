import { mockQuestionFavorites } from "@/mocks";
import type { QuestionFavoriteEntity, QuestionFavoriteRepository } from "../contracts/question-favorite-repository";

/** Implementação mock — seed inicial de `src/mocks/data/mock-exam-attempts.ts` (ADR-0011). */
let store: QuestionFavoriteEntity[] = [...mockQuestionFavorites];

export class MockQuestionFavoriteRepository implements QuestionFavoriteRepository {
  async listByUserId(userId: string): Promise<QuestionFavoriteEntity[]> {
    return store.filter((favorite) => favorite.userId === userId);
  }

  async isFavorite(userId: string, questionId: string): Promise<boolean> {
    return store.some((favorite) => favorite.userId === userId && favorite.questionId === questionId);
  }

  async toggle(userId: string, questionId: string): Promise<boolean> {
    const index = store.findIndex((favorite) => favorite.userId === userId && favorite.questionId === questionId);
    if (index >= 0) {
      store.splice(index, 1);
      return false;
    }
    store.push({ userId, questionId, createdAt: new Date().toISOString() });
    return true;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockQuestionFavoriteStore(): void {
  store = [...mockQuestionFavorites];
}
