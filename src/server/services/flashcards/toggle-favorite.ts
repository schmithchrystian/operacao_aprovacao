import type { FlashcardFavoriteResultDTO } from "@/contracts/flashcards";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { toggleFavorite as toggleFavoriteEntry } from "./favorite-store";
import { loadReviewableFlashcard } from "./shared";

/**
 * Favorita/desfavorita um cartão para o aluno autenticado. Funciona para QUALQUER cartão
 * acessível (baralho de matéria público OU baralho pessoal do próprio aluno,
 * `./shared.ts#loadReviewableFlashcard`) — favoritar é uma relação por usuário, independente de
 * quem é dono do baralho (ver `./favorite-store.ts` para a pendência de schema).
 *
 * Autorização (ADR-0006): `requireUser` + `assertOwnership` + `loadReviewableFlashcard`.
 */
export async function toggleFavorite(
  userId: string,
  flashcardId: string,
  now: Date = new Date(),
): Promise<FlashcardFavoriteResultDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  await loadReviewableFlashcard(userId, flashcardId); // garante existência + acesso (404 anti-IDOR).

  const isFavorite = toggleFavoriteEntry(userId, flashcardId, now);

  auditLog({
    operation: "flashcards.toggle-favorite",
    userId,
    entity: "Flashcard",
    entityId: flashcardId,
    result: "success",
    correlationId: flashcardId,
    metadata: { isFavorite },
  });

  return { flashcardId, isFavorite };
}
