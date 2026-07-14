import type { DeckDTO } from "@/contracts/flashcards";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import type { FlashcardEntity } from "@/server/repositories/contracts/flashcard-repository";
import { listFavoriteFlashcardIds } from "./favorite-store";
import { toDeckDTO } from "./mappers";
import { isCardDue, loadLatestReviewsByFlashcardId } from "./shared";

/** Ordem de exibição por tipo de baralho — Favoritos em destaque primeiro, depois matéria
 *  (alfabética), pessoais, erros e anotações por último. */
const TYPE_ORDER: Record<DeckDTO["type"], number> = {
  FAVORITES: 0,
  SUBJECT: 1,
  PERSONAL: 2,
  ERRORS: 3,
  NOTES: 4,
};

/**
 * Lista os baralhos acessíveis pelo aluno autenticado: baralhos de MATÉRIA (sistema, públicos),
 * baralhos PESSOAIS (personalizado + "criados do caderno de erros" + "criados de anotações") e
 * um baralho virtual "Favoritos" sintetizado (agregando cartões favoritados de QUALQUER baralho
 * acessível — favoritar não move o cartão de baralho, ver `./favorite-store.ts`). Cada baralho
 * traz `cardCount` e `dueCount` — `dueCount` é sempre calculado pelo histórico de revisão DESTE
 * usuário (`FlashcardReview`), mesmo para baralhos de matéria compartilhados entre alunos.
 *
 * Autorização (ADR-0006): `requireUser` + `assertOwnership`.
 */
export async function listDecks(userId: string, now: Date = new Date()): Promise<DeckDTO[]> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const [systemDecks, personalDecks] = await Promise.all([
    repos.flashcardDecks.listSystemDecks(),
    repos.flashcardDecks.listByUserId(userId),
  ]);
  const accessibleDecks = [...systemDecks, ...personalDecks];

  const allCards = await repos.flashcards.listByDeckIds(accessibleDecks.map((deck) => deck.id));
  const cardsByDeckId = new Map<string, FlashcardEntity[]>();
  for (const card of allCards) {
    const list = cardsByDeckId.get(card.deckId) ?? [];
    list.push(card);
    cardsByDeckId.set(card.deckId, list);
  }

  const latestReviews = await loadLatestReviewsByFlashcardId(
    userId,
    allCards.map((card) => card.id),
  );

  const deckDTOs = await Promise.all(
    accessibleDecks.map((deck) => {
      const cards = cardsByDeckId.get(deck.id) ?? [];
      const dueCount = cards.filter((card) => isCardDue(latestReviews.get(card.id), now)).length;
      return toDeckDTO(deck, cards.length, dueCount);
    }),
  );

  const favoriteIds = new Set(listFavoriteFlashcardIds(userId));
  const favoriteCards = allCards.filter((card) => favoriteIds.has(card.id));
  const favoritesDeck: DeckDTO = {
    id: "virtual-favorites",
    title: "Favoritos",
    type: "FAVORITES",
    subjectId: null,
    subjectName: null,
    cardCount: favoriteCards.length,
    dueCount: favoriteCards.filter((card) => isCardDue(latestReviews.get(card.id), now)).length,
  };

  return [...deckDTOs, favoritesDeck].sort((a, b) => {
    const diff = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
    return diff !== 0 ? diff : a.title.localeCompare(b.title);
  });
}
