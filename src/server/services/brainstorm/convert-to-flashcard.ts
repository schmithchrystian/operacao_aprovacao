import type { BrainstormCardDTO } from "@/contracts/brainstorm";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import { createFlashcardDraft } from "./flashcard-draft-store";
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
export async function convertToFlashcard(
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

  const draft = createFlashcardDraft(userId, card.id, card.title, card.content ?? "", now);

  const repos = getRepositories();
  const updated = await repos.brainstormCards.update({
    id: card.id,
    status: "CONVERTED",
    convertedFlashcardId: draft.id,
    now,
  });

  auditLog({
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
