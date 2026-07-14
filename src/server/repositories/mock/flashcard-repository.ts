import { mockFlashcards } from "@/mocks";
import type { FlashcardCreateInput, FlashcardEntity, FlashcardRepository } from "../contracts/flashcard-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/flashcards.ts` (ADR-0011). Só
 *  cartões `PUBLISHED` e não excluídos (`deletedAt: null`) — mesmo padrão de
 *  `MockQuestionRepository` (`status` default aplicado pelo repositório, não pelo chamador).
 *  Estado via `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo. */
const store = mockStore<FlashcardEntity[]>("flashcard", () => [...mockFlashcards]);
const sequence = mockStore<{ value: number }>("flashcard:sequence", () => ({ value: store.length }));

function isVisible(card: FlashcardEntity): boolean {
  return card.status === "PUBLISHED" && card.deletedAt === null;
}

export class MockFlashcardRepository implements FlashcardRepository {
  async findById(id: string): Promise<FlashcardEntity | null> {
    const card = store.find((item) => item.id === id);
    return card && isVisible(card) ? card : null;
  }

  async listByDeckId(deckId: string): Promise<FlashcardEntity[]> {
    return store.filter((card) => card.deckId === deckId && isVisible(card));
  }

  async listByDeckIds(deckIds: string[]): Promise<FlashcardEntity[]> {
    const idSet = new Set(deckIds);
    return store.filter((card) => idSet.has(card.deckId) && isVisible(card));
  }

  async create(input: FlashcardCreateInput): Promise<FlashcardEntity> {
    sequence.value += 1;
    const nowIso = input.now.toISOString();
    const card: FlashcardEntity = {
      id: `flashcard-mock-${sequence.value}`,
      deckId: input.deckId,
      subjectId: input.subjectId,
      topicId: input.topicId,
      question: input.question,
      answer: input.answer,
      difficulty: input.difficulty,
      tags: input.tags,
      status: "PUBLISHED",
      createdAt: nowIso,
      updatedAt: nowIso,
      deletedAt: null,
    };
    store.push(card);
    return card;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockFlashcardStore(): void {
  store.splice(0, store.length, ...mockFlashcards);
  sequence.value = store.length;
}
