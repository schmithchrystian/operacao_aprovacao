import { SPACED_REPETITION } from "@/config/business";
import type { DeckDTO, FlashcardDTO } from "@/contracts/flashcards";
import { getRepositories } from "@/server/repositories";
import type { FlashcardDeckEntity, FlashcardDeckKind } from "@/server/repositories/contracts/flashcard-deck-repository";
import type { FlashcardEntity } from "@/server/repositories/contracts/flashcard-repository";
import type { FlashcardReviewEntity } from "@/server/repositories/contracts/flashcard-review-repository";
import { listFavoriteFlashcardIds } from "./favorite-store";
import { isCardDue, loadLatestReviewsByFlashcardId, publicTags } from "./shared";

/**
 * Mapeamento entidade (persistência) → DTO (contrato) do domínio Flashcards (Fase 14) — resolve
 * nomes de matéria/assunto/baralho (a entidade só guarda os ids, ADR-0003) e deriva
 * `isFavorite`/`isDue`/campos de repetição espaçada a partir da última revisão do usuário. Mesmo
 * estilo de `@/server/services/brainstorm/mappers.ts`.
 */

/** Converte um único cartão para DTO. Prefira `toFlashcardDTOs` ao mapear uma LISTA (evita 1
 *  query de revisão/favorito por cartão). */
export async function toFlashcardDTO(
  card: FlashcardEntity,
  userId: string,
  now: Date,
  deck?: FlashcardDeckEntity | null,
): Promise<FlashcardDTO> {
  const repos = getRepositories();
  const [resolvedDeck, latestReview, favoriteIds] = await Promise.all([
    deck !== undefined ? Promise.resolve(deck) : repos.flashcardDecks.findById(card.deckId),
    repos.flashcardReviews.findLatestByUserAndFlashcard(userId, card.id),
    Promise.resolve(listFavoriteFlashcardIds(userId)),
  ]);
  return buildFlashcardDTO(card, resolvedDeck, latestReview ?? undefined, favoriteIds.includes(card.id), now);
}

/** Converte uma lista de cartões para DTO em LOTE — uma única consulta de revisões/favoritos
 *  para todos os cartões, independente de quantos forem (usado por `listDecks`/`getReviewSession`). */
export async function toFlashcardDTOs(
  cards: readonly FlashcardEntity[],
  userId: string,
  now: Date,
): Promise<FlashcardDTO[]> {
  if (cards.length === 0) return [];
  const repos = getRepositories();

  const deckIds = [...new Set(cards.map((card) => card.deckId))];
  const [deckEntries, latestReviews, favoriteIds] = await Promise.all([
    Promise.all(deckIds.map(async (deckId) => [deckId, await repos.flashcardDecks.findById(deckId)] as const)),
    loadLatestReviewsByFlashcardId(
      userId,
      cards.map((card) => card.id),
    ),
    Promise.resolve(new Set(listFavoriteFlashcardIds(userId))),
  ]);
  const decksById = new Map(deckEntries);

  return Promise.all(
    cards.map((card) =>
      buildFlashcardDTO(card, decksById.get(card.deckId) ?? null, latestReviews.get(card.id), favoriteIds.has(card.id), now),
    ),
  );
}

async function buildFlashcardDTO(
  card: FlashcardEntity,
  deck: FlashcardDeckEntity | null,
  latestReview: FlashcardReviewEntity | undefined,
  isFavorite: boolean,
  now: Date,
): Promise<FlashcardDTO> {
  const repos = getRepositories();
  const [subject, topic] = await Promise.all([
    card.subjectId ? repos.subjects.findById(card.subjectId) : Promise.resolve(null),
    card.topicId ? repos.topics.findById(card.topicId) : Promise.resolve(null),
  ]);

  return {
    id: card.id,
    deckId: card.deckId,
    deckTitle: deck?.title ?? "—",
    question: card.question,
    answer: card.answer,
    subjectId: card.subjectId,
    subjectName: subject?.name ?? null,
    topicId: card.topicId,
    topicName: topic?.name ?? null,
    difficulty: card.difficulty,
    tags: publicTags(card.tags),
    isFavorite,
    lastReviewedAt: latestReview?.reviewedAt ?? null,
    nextReviewAt: latestReview?.nextReviewAt ?? null,
    intervalDays: latestReview?.intervalDays ?? 0,
    easeFactor: latestReview?.easeFactor ?? SPACED_REPETITION.defaultEaseFactor,
    repetition: latestReview?.repetition ?? 0,
    isDue: isCardDue(latestReview, now),
    createdAt: card.createdAt,
  };
}

/** Espelha `FlashcardDeckKind` (repositório) → `type` do DTO — 1:1, `FAVORITES` nunca vem daqui
 *  (é sintetizado por `listDecks`, que monta o `DeckDTO` de favoritos diretamente). */
function deckKindToType(kind: FlashcardDeckKind): DeckDTO["type"] {
  return kind;
}

export async function toDeckDTO(deck: FlashcardDeckEntity, cardCount: number, dueCount: number): Promise<DeckDTO> {
  const repos = getRepositories();
  const subject = deck.subjectId ? await repos.subjects.findById(deck.subjectId) : null;
  return {
    id: deck.id,
    title: deck.title,
    type: deckKindToType(deck.kind),
    subjectId: deck.subjectId,
    subjectName: subject?.name ?? null,
    cardCount,
    dueCount,
  };
}
