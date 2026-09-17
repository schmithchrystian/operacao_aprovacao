import { inRepositoryTransaction } from "@/server/repositories/transaction";
import type { BrainstormCardDTO } from "@/contracts/brainstorm";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import { getOrCreatePersonalDeck } from "@/server/services/flashcards/shared";
import { toBrainstormCardDTO } from "./mappers";
import { loadOwnedCard } from "./shared";

/**
 * Converte um cartão em um rascunho de flashcard (pergunta = título, resposta = conteúdo) e
 * marca o cartão como `CONVERTED`. O repositório REAL de Flashcard é da Fase 14 (ainda não
 * existe, ver `@/server/services/brainstorm/flashcard-draft-store.ts` — TODO explícito, não
 * uma implementação da Fase 14 inteira). IDEMPOTENTE: se o cartão já tem
 * `convertedFlashcardId`, devolve o estado atual sem gerar um 2º rascunho.
 *
 * Autorização (ADR-0006): `requireUser` + `assertOwnership` + `loadOwnedCard` (anti-IDOR).
 */
async function convertToFlashcardInTransaction(
  userId: string,
  cardId: string,
  now: Date = new Date(),
): Promise<BrainstormCardDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const { column, card } = await loadOwnedCard(userId, cardId);

  if (card.convertedFlashcardId) {
    return toBrainstormCardDTO(card, column.name); // já convertido — idempotente.
  }

  const repos = getRepositories();
  const deck = await getOrCreatePersonalDeck(userId, "NOTES", "Criados de anotações", now);
  const draft = await repos.flashcards.create({ deckId: deck.id, subjectId: card.subjectId, topicId: card.topicId, question: card.title, answer: card.content?.trim() || "Complemente esta resposta ao revisar.", difficulty: "MEDIUM", tags: [...card.tags, `src:brainstorm:${card.id}`], now });
  const updated = await repos.brainstormCards.update({
    id: card.id,
    status: "CONVERTED",
    convertedFlashcardId: draft.id,
    now,
  });

  await auditLog({
    operation: "brainstorm.convert-to-flashcard",
    userId,
    entity: "BrainstormCard",
    entityId: card.id,
    result: "success",
    correlationId: card.id,
    metadata: { draftId: draft.id },
  });

  return toBrainstormCardDTO(updated, column.name);
}

export async function convertToFlashcard(...args: Parameters<typeof convertToFlashcardInTransaction>): ReturnType<typeof convertToFlashcardInTransaction> {
  return inRepositoryTransaction(() => convertToFlashcardInTransaction(...args));
}
