import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por "@/server/authorization").
const {
  listDecksAction,
  getReviewSessionAction,
  reviewCardAction,
  createDeckAction,
  createCardAction,
  createFromErrorsAction,
  createFromNotesAction,
  toggleFavoriteAction,
  getRetentionStatsAction,
} = await import("@/server/actions/flashcards");
const { __resetMockFlashcardDeckStore } = await import("@/server/repositories/mock/flashcard-deck-repository");
const { __resetMockFlashcardStore } = await import("@/server/repositories/mock/flashcard-repository");
const { __resetMockFlashcardReviewStore } = await import("@/server/repositories/mock/flashcard-review-repository");
const { __resetFlashcardFavoriteStore } = await import("@/server/services/flashcards/favorite-store");
const { __resetMockGamificationEventStore } = await import("@/server/repositories/mock/gamification-event-repository");
const { __resetMockPointTransactionStore } = await import("@/server/repositories/mock/point-transaction-repository");
const { __resetMockUserAchievementStore } = await import("@/server/repositories/mock/user-achievement-repository");
const { __resetReviewLockStore, __resetFlashcardsRateLimitStore } = await import("@/server/services/flashcards");
const { __resetFlashcardDraftStore } = await import("@/server/services/brainstorm/flashcard-draft-store");

/**
 * Testes de fronteira (Server Actions — ActionResult) do domínio "Flashcards" (Fase 14):
 * autorização (sessão ausente -> UNAUTHENTICATED; recurso de outro usuário/não devido ->
 * NOT_FOUND/CONFLICT) e validação de entrada (Zod -> VALIDATION_ERROR) na fronteira, além de um
 * fluxo feliz completo. Mesmo padrão de `tests/unit/brainstorm-action-authorization.test.ts`.
 */
function fakeSession(id: string): NextAuthSession {
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("actions/flashcards — autorização e validação na fronteira (ActionResult)", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockFlashcardDeckStore();
    __resetMockFlashcardStore();
    __resetMockFlashcardReviewStore();
    __resetFlashcardFavoriteStore();
    __resetMockGamificationEventStore();
    __resetMockPointTransactionStore();
    __resetMockUserAchievementStore();
    __resetReviewLockStore();
    __resetFlashcardsRateLimitStore();
    __resetFlashcardDraftStore();
  });

  describe("listDecksAction / getReviewSessionAction / getRetentionStatsAction", () => {
    it("retornam fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);

      const decksResult = await listDecksAction();
      expect(decksResult.ok).toBe(false);
      if (!decksResult.ok) expect(decksResult.error.code).toBe("UNAUTHENTICATED");

      const sessionResult = await getReviewSessionAction({});
      expect(sessionResult.ok).toBe(false);
      if (!sessionResult.ok) expect(sessionResult.error.code).toBe("UNAUTHENTICATED");

      const statsResult = await getRetentionStatsAction();
      expect(statsResult.ok).toBe(false);
      if (!statsResult.ok) expect(statsResult.error.code).toBe("UNAUTHENTICATED");
    });

    it("listDecksAction retorna ok com os baralhos do aluno autenticado", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));
      const result = await listDecksAction();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.length).toBeGreaterThan(0);
    });

    it("getReviewSessionAction retorna fail VALIDATION_ERROR com deckId vazio", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));
      const result = await getReviewSessionAction({ deckId: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("getReviewSessionAction retorna fail NOT_FOUND para um baralho inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));
      const result = await getReviewSessionAction({ deckId: "baralho-inexistente" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });
  });

  describe("reviewCardAction", () => {
    it("retorna fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);
      const result = await reviewCardAction({ flashcardId: "flashcard-direito-penal-01", rating: "GOOD" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
    });

    it("retorna fail VALIDATION_ERROR com classificação inválida", async () => {
      authMock.mockResolvedValue(fakeSession("user-review-invalid"));
      const result = await reviewCardAction({ flashcardId: "flashcard-direito-penal-01", rating: "REGULAR" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna fail NOT_FOUND para um cartão inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("user-review-nf"));
      const result = await reviewCardAction({ flashcardId: "cartao-inexistente", rating: "GOOD" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });

    it("retorna fail CONFLICT ao revisar um cartão ainda não devido", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));
      // O seed define o vencimento em 2026-07-17; fixar o relogio evita que este teste expire.
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-07-16T12:00:00.000Z"));

      try {
        const result = await reviewCardAction({
          flashcardId: "flashcard-lingua-portuguesa-02",
          rating: "GOOD",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("CONFLICT");
      } finally {
        vi.useRealTimers();
      }
    });

    it("retorna ok e credita pontos ao revisar um cartão devido com classificação positiva", async () => {
      authMock.mockResolvedValue(fakeSession("user-review-ok-1"));
      const result = await reviewCardAction({ flashcardId: "flashcard-direito-penal-01", rating: "EASY" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.repetition).toBe(1);
        expect(result.data.isDue).toBe(false);
      }
    });
  });

  describe("createDeckAction / createCardAction", () => {
    it("retorna fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);
      const deckResult = await createDeckAction({ title: "Baralho" });
      expect(deckResult.ok).toBe(false);
      if (!deckResult.ok) expect(deckResult.error.code).toBe("UNAUTHENTICATED");
    });

    it("createDeckAction retorna fail VALIDATION_ERROR com título vazio", async () => {
      authMock.mockResolvedValue(fakeSession("user-deck-1"));
      const result = await createDeckAction({ title: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("createCardAction retorna fail VALIDATION_ERROR com pergunta/resposta vazias", async () => {
      authMock.mockResolvedValue(fakeSession("user-card-1"));
      const deck = await createDeckAction({ title: "Baralho" });
      expect(deck.ok).toBe(true);
      if (!deck.ok) return;

      const result = await createCardAction({ deckId: deck.data.id, question: "", answer: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("createCardAction retorna fail NOT_FOUND para um baralho inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("user-card-2"));
      const result = await createCardAction({ deckId: "baralho-inexistente", question: "P?", answer: "R." });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });

    it("descarta tags no namespace reservado src: enviadas pelo cliente (achado B1)", async () => {
      authMock.mockResolvedValue(fakeSession("user-card-b1"));
      const deck = await createDeckAction({ title: "Baralho" });
      expect(deck.ok).toBe(true);
      if (!deck.ok) return;

      // O aluno tenta forjar as marcações internas de proveniência (src:error:*/src:note:*) que
      // as importações usam para dedup — o schema descarta o namespace src: (case-insensitive).
      const result = await createCardAction({
        deckId: deck.data.id,
        question: "Pergunta?",
        answer: "Resposta.",
        tags: ["real", "src:error:question-forjada", "SRC:note:forjado"],
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.tags).toEqual(["real"]);
    });
  });

  describe("toggleFavoriteAction", () => {
    it("retorna fail VALIDATION_ERROR sem flashcardId", async () => {
      authMock.mockResolvedValue(fakeSession("user-fav-1"));
      const result = await toggleFavoriteAction({});
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna fail NOT_FOUND para um cartão inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("user-fav-2"));
      const result = await toggleFavoriteAction({ flashcardId: "cartao-inexistente" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });
  });

  describe("createFromErrorsAction / createFromNotesAction", () => {
    it("retornam fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);
      const errorsResult = await createFromErrorsAction();
      expect(errorsResult.ok).toBe(false);
      if (!errorsResult.ok) expect(errorsResult.error.code).toBe("UNAUTHENTICATED");

      const notesResult = await createFromNotesAction();
      expect(notesResult.ok).toBe(false);
      if (!notesResult.ok) expect(notesResult.error.code).toBe("UNAUTHENTICATED");
    });

    it("retornam ok com os cartões importados para o aluno autenticado", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));
      const errorsResult = await createFromErrorsAction();
      expect(errorsResult.ok).toBe(true);

      const notesResult = await createFromNotesAction();
      expect(notesResult.ok).toBe(true);
    });
  });

  describe("fluxo completo", () => {
    it("cria baralho, cria cartão, favorita, revisa (credita pontos) e consulta retenção", async () => {
      authMock.mockResolvedValue(fakeSession("user-flow-flashcards"));

      const deck = await createDeckAction({ title: "Revisão final" });
      expect(deck.ok).toBe(true);
      if (!deck.ok) return;

      const card = await createCardAction({
        deckId: deck.data.id,
        question: "O que é uma vitória na Operação Aprovação?",
        answer: "Cada aula concluída.",
      });
      expect(card.ok).toBe(true);
      if (!card.ok) return;

      const favorited = await toggleFavoriteAction({ flashcardId: card.data.id });
      expect(favorited.ok).toBe(true);
      if (favorited.ok) expect(favorited.data.isFavorite).toBe(true);

      const reviewed = await reviewCardAction({ flashcardId: card.data.id, rating: "GOOD" });
      expect(reviewed.ok).toBe(true);
      if (reviewed.ok) {
        expect(reviewed.data.intervalDays).toBe(3);
        expect(reviewed.data.isFavorite).toBe(true);
      }

      const stats = await getRetentionStatsAction();
      expect(stats.ok).toBe(true);
      if (stats.ok) {
        expect(stats.data.totalReviews).toBe(1);
        expect(stats.data.correctReviews).toBe(1);
      }
    });
  });
});
