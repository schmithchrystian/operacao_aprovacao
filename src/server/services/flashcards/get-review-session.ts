import { SPACED_REPETITION } from "@/config/business";
import type { ReviewSessionDTO } from "@/contracts/flashcards";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import { toFlashcardDTOs } from "./mappers";
import { dueSince, isCardDue, loadAccessibleDeck, loadLatestReviewsByFlashcardId } from "./shared";

/**
 * Monta a sessão de revisão: cartões DEVIDOS agora, ordenados por prioridade (mais atrasado —
 * ou mais tempo esperando, para um cartão nunca revisado — primeiro, `./shared.ts#dueSince`).
 *
 * `deckId` informado → só os cartões DESSE baralho (deve ser acessível — matéria pública ou
 * baralho pessoal do próprio aluno; `NotFoundError` anti-IDOR caso contrário). Omitido → agrega
 * TODOS os baralhos acessíveis (matéria + pessoais).
 *
 * `cards` é limitado a `SPACED_REPETITION.sessionMaxCards` (`@/config/business`) para não
 * devolver um payload gigante quando há muitos cartões atrasados de uma vez; `totalDue` sempre
 * reporta a contagem REAL (antes do corte), para a UI comunicar "revisando 30 de 47", por exemplo.
 *
 * Autorização (ADR-0006): `requireUser` + `assertOwnership` (+ `loadAccessibleDeck` quando
 * `deckId` é informado).
 */
export async function getReviewSession(
  userId: string,
  deckId?: string,
  now: Date = new Date(),
): Promise<ReviewSessionDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();

  let deckIds: string[];
  if (deckId) {
    const deck = await loadAccessibleDeck(userId, deckId);
    deckIds = [deck.id];
  } else {
    const [systemDecks, personalDecks] = await Promise.all([
      repos.flashcardDecks.listSystemDecks(),
      repos.flashcardDecks.listByUserId(userId),
    ]);
    deckIds = [...systemDecks, ...personalDecks].map((deck) => deck.id);
  }

  const cards = await repos.flashcards.listByDeckIds(deckIds);
  const latestReviews = await loadLatestReviewsByFlashcardId(
    userId,
    cards.map((card) => card.id),
  );

  const dueCards = cards
    .filter((card) => isCardDue(latestReviews.get(card.id), now))
    .sort(
      (a, b) =>
        Date.parse(dueSince(a, latestReviews.get(a.id))) - Date.parse(dueSince(b, latestReviews.get(b.id))),
    );

  const totalDue = dueCards.length;
  const limited = dueCards.slice(0, SPACED_REPETITION.sessionMaxCards);
  const cardDTOs = await toFlashcardDTOs(limited, userId, now);

  return { deckId: deckId ?? null, cards: cardDTOs, totalDue };
}
