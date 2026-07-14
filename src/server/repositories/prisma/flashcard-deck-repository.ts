import type {
  FlashcardDeckCreateInput,
  FlashcardDeckEntity,
  FlashcardDeckKind,
  FlashcardDeckRepository,
} from "../contracts/flashcard-deck-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`backend` a partir da Fase de
 * banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 *
 * PENDÊNCIA (ver `../contracts/flashcard-deck-repository.ts`): `FlashcardDeckEntity.kind` ainda
 * não tem coluna própria em `FlashcardDeck` — a implementação real precisa dessa migration (ou
 * de outra forma de derivar o tipo) antes de existir de verdade (ver `docs/FLASHCARDS.md`).
 */
export class PrismaFlashcardDeckRepository implements FlashcardDeckRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<FlashcardDeckEntity | null> {
    throw new Error("not implemented: PrismaFlashcardDeckRepository.findById");
  }

  async listSystemDecks(): Promise<FlashcardDeckEntity[]> {
    throw new Error("not implemented: PrismaFlashcardDeckRepository.listSystemDecks");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<FlashcardDeckEntity[]> {
    throw new Error("not implemented: PrismaFlashcardDeckRepository.listByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByUserIdAndKind(_userId: string, _kind: FlashcardDeckKind): Promise<FlashcardDeckEntity | null> {
    throw new Error("not implemented: PrismaFlashcardDeckRepository.findByUserIdAndKind");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: FlashcardDeckCreateInput): Promise<FlashcardDeckEntity> {
    throw new Error("not implemented: PrismaFlashcardDeckRepository.create");
  }
}
