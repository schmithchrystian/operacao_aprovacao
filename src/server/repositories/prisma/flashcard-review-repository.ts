import type {
  FlashcardReviewCreateInput,
  FlashcardReviewEntity,
  FlashcardReviewRepository,
} from "../contracts/flashcard-review-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`backend` a partir da Fase de
 * banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 *
 * PENDÊNCIA (performance): `listLatestByUserIdForFlashcardIds` deve ser implementado com uma
 * query agregada (`DISTINCT ON`/`groupBy` + `orderBy reviewedAt desc`), nunca carregando todo o
 * histórico de revisões em memória para reduzir no Node — o mock (`../mock/`) faz a redução em
 * memória porque o volume de teste é desprezível.
 */
export class PrismaFlashcardReviewRepository implements FlashcardReviewRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findLatestByUserAndFlashcard(_userId: string, _flashcardId: string): Promise<FlashcardReviewEntity | null> {
    throw new Error("not implemented: PrismaFlashcardReviewRepository.findLatestByUserAndFlashcard");
  }

  async listLatestByUserIdForFlashcardIds(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _flashcardIds: string[],
  ): Promise<FlashcardReviewEntity[]> {
    throw new Error("not implemented: PrismaFlashcardReviewRepository.listLatestByUserIdForFlashcardIds");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<FlashcardReviewEntity[]> {
    throw new Error("not implemented: PrismaFlashcardReviewRepository.listByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: FlashcardReviewCreateInput): Promise<FlashcardReviewEntity> {
    throw new Error("not implemented: PrismaFlashcardReviewRepository.create");
  }
}
