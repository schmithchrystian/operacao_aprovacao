// Repetição espaçada — algoritmo puro (CLAUDE.md §19/§25, ver cabeçalho de `./spaced-repetition.ts`).
export {
  computeNextReview,
  isCorrectRating,
  addIntervalDays,
  NEW_CARD_STATE,
  type SpacedRepetitionState,
} from "./spaced-repetition";

// Mapeamento entidade -> DTO.
export { toFlashcardDTO, toFlashcardDTOs, toDeckDTO } from "./mappers";

// Leituras.
export { listDecks } from "./list-decks";
export { getReviewSession } from "./get-review-session";
export { getRetentionStats } from "./retention-stats";

// Mutações.
export { createDeck } from "./create-deck";
export { createCard } from "./create-card";
export { createFromErrors } from "./create-from-errors";
export { createFromNotes } from "./create-from-notes";
export { reviewCard } from "./review-card";
export { toggleFavorite } from "./toggle-favorite";

// Favoritos — leitura (a mutação passa sempre por `toggleFavorite` acima, autorizada/auditada).
export { isFavorite, listFavoriteFlashcardIds } from "./favorite-store";

// Rate limit leve de revisão (defesa em profundidade — achado A1).
export {
  assertReviewCardRateLimit,
  checkFlashcardsRateLimit,
  reviewCardRateLimitKey,
  __resetFlashcardsRateLimitStore,
} from "./rate-limit";

// Serialização por (userId, flashcardId) da seção crítica de `reviewCard` (anti-farm — achado A1).
export { reviewLockKey, withReviewLock, __resetReviewLockStore } from "./review-lock";
