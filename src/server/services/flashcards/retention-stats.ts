import type { RetentionStatsDTO } from "@/contracts/flashcards";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import { isCardDue, loadLatestReviewsByFlashcardId } from "./shared";
import { isCorrectRating } from "./spaced-repetition";

/**
 * Estatísticas de retenção do aluno autenticado: histórico COMPLETO de revisões (qualquer
 * cartão já revisado, mesmo que o baralho de origem não seja mais acessível) para
 * `totalReviews`/`correctReviews`/`retentionPercent`, e a contagem de cartões ATUALMENTE
 * acessíveis (matéria + pessoais) para `totalCards`/`dueNowCount`.
 *
 * `retentionPercent = correctReviews / totalReviews * 100` (2 casas decimais; `0` quando não há
 * nenhuma revisão ainda) — "correto" segue a mesma regra de `reviewCard`/`isCorrectRating`
 * (Difícil/Médio/Fácil contam, Errei não).
 *
 * Autorização (ADR-0006): `requireUser` + `assertOwnership`.
 */
export async function getRetentionStats(userId: string, now: Date = new Date()): Promise<RetentionStatsDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const [systemDecks, personalDecks, reviews] = await Promise.all([
    repos.flashcardDecks.listSystemDecks(),
    repos.flashcardDecks.listByUserId(userId),
    repos.flashcardReviews.listByUserId(userId),
  ]);

  const accessibleDeckIds = [...systemDecks, ...personalDecks].map((deck) => deck.id);
  const cards = await repos.flashcards.listByDeckIds(accessibleDeckIds);

  const totalReviews = reviews.length;
  const correctReviews = reviews.filter((review) => isCorrectRating(review.rating)).length;
  const retentionPercent = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 10000) / 100 : 0;
  const cardsReviewedAtLeastOnce = new Set(reviews.map((review) => review.flashcardId)).size;

  const latestReviews = await loadLatestReviewsByFlashcardId(
    userId,
    cards.map((card) => card.id),
  );
  const dueNowCount = cards.filter((card) => isCardDue(latestReviews.get(card.id), now)).length;

  return {
    totalCards: cards.length,
    cardsReviewedAtLeastOnce,
    totalReviews,
    correctReviews,
    retentionPercent,
    dueNowCount,
  };
}
