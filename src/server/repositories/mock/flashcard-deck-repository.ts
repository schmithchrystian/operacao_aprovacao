import { mockFlashcardDecks } from "@/mocks";
import type {
  FlashcardDeckCreateInput,
  FlashcardDeckEntity,
  FlashcardDeckKind,
  FlashcardDeckRepository,
} from "../contracts/flashcard-deck-repository";

/** Implementação mock — seed inicial de `src/mocks/data/flashcards.ts` (ADR-0011). */
let store: FlashcardDeckEntity[] = [...mockFlashcardDecks];
let sequence = store.length;

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
    sequence += 1;
    const nowIso = input.now.toISOString();
    const deck: FlashcardDeckEntity = {
      id: `flashcard-deck-mock-${sequence}`,
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
  store = [...mockFlashcardDecks];
  sequence = store.length;
}
