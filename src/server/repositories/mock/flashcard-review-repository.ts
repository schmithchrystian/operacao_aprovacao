import { mockFlashcardReviews } from "@/mocks";
import type {
  FlashcardReviewCreateInput,
  FlashcardReviewEntity,
  FlashcardReviewRepository,
} from "../contracts/flashcard-review-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/flashcards.ts` (ADR-0011). APPEND-ONLY:
 *  nunca há update/delete (mesma garantia da entidade real, docs/DATA-MODEL.md). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo. */
const store = mockStore<FlashcardReviewEntity[]>("flashcard-review", () => [...mockFlashcardReviews]);
const sequence = mockStore<{ value: number }>("flashcard-review:sequence", () => ({ value: store.length }));

/** Reduz uma lista de revisões à mais recente (maior `reviewedAt`) por `flashcardId`. */
function latestByFlashcard(reviews: FlashcardReviewEntity[]): Map<string, FlashcardReviewEntity> {
  const latest = new Map<string, FlashcardReviewEntity>();
  for (const review of reviews) {
    const current = latest.get(review.flashcardId);
    if (!current || Date.parse(review.reviewedAt) > Date.parse(current.reviewedAt)) {
      latest.set(review.flashcardId, review);
    }
  }
  return latest;
}

export class MockFlashcardReviewRepository implements FlashcardReviewRepository {
  async findLatestByUserAndFlashcard(userId: string, flashcardId: string): Promise<FlashcardReviewEntity | null> {
    const reviews = store.filter((review) => review.userId === userId && review.flashcardId === flashcardId);
    if (reviews.length === 0) return null;
    return [...latestByFlashcard(reviews).values()][0]!;
  }

  async listLatestByUserIdForFlashcardIds(
    userId: string,
    flashcardIds: string[],
  ): Promise<FlashcardReviewEntity[]> {
    const idSet = new Set(flashcardIds);
    const reviews = store.filter((review) => review.userId === userId && idSet.has(review.flashcardId));
    return [...latestByFlashcard(reviews).values()];
  }

  async listByUserId(userId: string): Promise<FlashcardReviewEntity[]> {
    return store.filter((review) => review.userId === userId);
  }

  async create(input: FlashcardReviewCreateInput): Promise<FlashcardReviewEntity> {
    sequence.value += 1;
    const review: FlashcardReviewEntity = {
      id: `flashcard-review-mock-${sequence.value}`,
      userId: input.userId,
      flashcardId: input.flashcardId,
      rating: input.rating,
      intervalDays: input.intervalDays,
      easeFactor: input.easeFactor,
      repetition: input.repetition,
      reviewedAt: input.now.toISOString(),
      nextReviewAt: input.nextReviewAt,
    };
    store.push(review);
    return review;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockFlashcardReviewStore(): void {
  store.splice(0, store.length, ...mockFlashcardReviews);
  sequence.value = store.length;
}
