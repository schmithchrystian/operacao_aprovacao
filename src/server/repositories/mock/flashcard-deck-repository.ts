import { mockFlashcardDecks } from "@/mocks";
import type {
  FlashcardDeckCreateInput,
  FlashcardDeckEntity,
  FlashcardDeckKind,
  FlashcardDeckRepository,
} from "../contracts/flashcard-deck-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/flashcards.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo. */
const store = mockStore<FlashcardDeckEntity[]>("flashcard-deck", () => [...mockFlashcardDecks]);
const sequence = mockStore<{ value: number }>("flashcard-deck:sequence", () => ({ value: store.length }));

export class MockFlashcardDeckRepository implements FlashcardDeckRepository {
  async findById(id: string): Promise<FlashcardDeckEntity | null> {
    return store.find((deck) => deck.id === id) ?? null;
  }

  async listSystemDecks(): Promise<FlashcardDeckEntity[]> {
    return store.filter((deck) => deck.kind === "SUBJECT");
  }

  async listByUserId(userId: string): Promise<FlashcardDeckEntity[]> {
    return store.filter((deck) => deck.userId === userId);
  }

  async findByUserIdAndKind(userId: string, kind: FlashcardDeckKind): Promise<FlashcardDeckEntity | null> {
    return store.find((deck) => deck.userId === userId && deck.kind === kind) ?? null;
  }

  async create(input: FlashcardDeckCreateInput): Promise<FlashcardDeckEntity> {
    sequence.value += 1;
    const nowIso = input.now.toISOString();
    const deck: FlashcardDeckEntity = {
      id: `flashcard-deck-mock-${sequence.value}`,
      userId: input.userId,
      subjectId: input.subjectId,
      title: input.title,
      isPublic: input.isPublic,
      kind: input.kind,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    store.push(deck);
    return deck;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockFlashcardDeckStore(): void {
  store.splice(0, store.length, ...mockFlashcardDecks);
  sequence.value = store.length;
}
