import type { FlashcardCreateInput, FlashcardEntity, FlashcardRepository } from "../contracts/flashcard-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`backend` a partir da Fase de
 * banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaFlashcardRepository implements FlashcardRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<FlashcardEntity | null> {
    throw new Error("not implemented: PrismaFlashcardRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByDeckId(_deckId: string): Promise<FlashcardEntity[]> {
    throw new Error("not implemented: PrismaFlashcardRepository.listByDeckId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByDeckIds(_deckIds: string[]): Promise<FlashcardEntity[]> {
    throw new Error("not implemented: PrismaFlashcardRepository.listByDeckIds");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: FlashcardCreateInput): Promise<FlashcardEntity> {
    throw new Error("not implemented: PrismaFlashcardRepository.create");
  }
}
