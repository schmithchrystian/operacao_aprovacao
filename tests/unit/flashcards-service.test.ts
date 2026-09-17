import { ensureAuthenticatedUser } from "../helpers/authenticated-user";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por "@/server/authorization").
const {
  listDecks,
  getReviewSession,
  reviewCard,
  createDeck,
  createCard,
  createFromErrors,
  createFromNotes,
  toggleFavorite,
  getRetentionStats,
} = await import("@/server/services/flashcards");
const { getRepositories } = await import("@/server/repositories");
const { eventBus } = await import("@/server/events");
const { buildIdempotencyKey } = await import("@/server/services/gamification");
const { __resetMockFlashcardDeckStore } = await import("@/server/repositories/mock/flashcard-deck-repository");
const { __resetMockFlashcardStore } = await import("@/server/repositories/mock/flashcard-repository");
const { __resetMockFlashcardReviewStore } = await import("@/server/repositories/mock/flashcard-review-repository");
const { __resetFlashcardFavoriteStore } = await import("@/server/services/flashcards/favorite-store");
const { __resetMockGamificationEventStore } = await import("@/server/repositories/mock/gamification-event-repository");
const { __resetMockPointTransactionStore } = await import("@/server/repositories/mock/point-transaction-repository");
const { __resetMockUserAchievementStore } = await import("@/server/repositories/mock/user-achievement-repository");
const { __resetReviewLockStore } = await import("@/server/services/flashcards/review-lock");
const { createFlashcardDraft, __resetFlashcardDraftStore } = await import(
  "@/server/services/brainstorm/flashcard-draft-store"
);

/**
 * Testes de serviço (I/O) do domínio "Flashcards" (Fase 14 — CLAUDE.md §19/§25): seleção de
 * devidos, repetição espaçada por classificação, pontuação (idempotência + anti-farm + "Errei
 * não pontua"), criação de baralho/cartão, importação de erros/anotações e autorização
 * (anti-IDOR). Mesmo padrão de `tests/unit/brainstorm-service.test.ts`.
 *
 * "Hoje" fixo em 2026-07-14T10:00 — mesma data de referência usada nos mocks
 * (`src/mocks/data/flashcards.ts`, `src/mocks/data/study-plan.ts`). Nesse instante, para
 * `user-1` (seed): `flashcard-lingua-portuguesa-01`/`flashcard-matematica-01`/
 * `flashcard-personal-01` estão ATRASADOS (devidos); `flashcard-lingua-portuguesa-02` ainda NÃO
 * está devido (próxima revisão em 2026-07-17); os demais 16 cartões nunca foram revisados por
 * `user-1` (devidos imediatamente) — total: 19 de 20 cartões devidos.
 */
function fakeSession(id: string): NextAuthSession {
  ensureAuthenticatedUser(id);
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

function loginAs(userId: string): void {
  authMock.mockResolvedValue(fakeSession(userId));
}

const FIXED_NOW = new Date("2026-07-14T10:00:00.000Z");

describe("services/flashcards", () => {
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
    __resetFlashcardDraftStore();
  });

  describe("listDecks", () => {
    it("lista baralhos de matéria + pessoais + favoritos, com cardCount/dueCount corretos", async () => {
      loginAs("user-1");
      const decks = await listDecks("user-1", FIXED_NOW);

      // 8 baralhos de matéria + pessoal + erros + anotações + favoritos (virtual) = 12.
      expect(decks.length).toBe(12);

      const lingua = decks.find((deck) => deck.title === "Flashcards — Língua Portuguesa")!;
      expect(lingua.type).toBe("SUBJECT");
      expect(lingua.cardCount).toBe(2);
      expect(lingua.dueCount).toBe(1); // lingua-01 atrasado, lingua-02 ainda não devido

      const personal = decks.find((deck) => deck.type === "PERSONAL")!;
      expect(personal.cardCount).toBe(2);
      expect(personal.dueCount).toBe(2); // personal-01 atrasado, personal-02 nunca revisado (devido)

      const errors = decks.find((deck) => deck.type === "ERRORS")!;
      expect(errors.title).toBe("Criados do caderno de erros");
      expect(errors.cardCount).toBe(1);
      expect(errors.dueCount).toBe(1);

      const notes = decks.find((deck) => deck.type === "NOTES")!;
      expect(notes.cardCount).toBe(1);

      const favorites = decks.find((deck) => deck.type === "FAVORITES")!;
      expect(favorites.cardCount).toBe(0); // ninguém favoritou nada ainda
      expect(favorites.dueCount).toBe(0);
    });

    it("rejeita listar baralhos de outro usuário (assertOwnership)", async () => {
      loginAs("user-1");
      await expect(listDecks("user-2", FIXED_NOW)).rejects.toThrow();
    });
  });

  describe("getReviewSession", () => {
    it("seleciona só os cartões devidos (respeitando nextReviewAt) e ordena por prioridade", async () => {
      loginAs("user-1");
      const session = await getReviewSession("user-1", undefined, FIXED_NOW);

      expect(session.totalDue).toBe(19);
      expect(session.cards.length).toBe(19); // abaixo de sessionMaxCards (30) — sem corte

      const ids = session.cards.map((card) => card.id);
      expect(ids).not.toContain("flashcard-lingua-portuguesa-02"); // não devido ainda

      // Mais atrasado (personal-01, devido desde 07-11) tem prioridade sobre lingua-01 (07-13).
      expect(ids.indexOf("flashcard-personal-01")).toBeLessThan(ids.indexOf("flashcard-lingua-portuguesa-01"));
    });

    it("restringe a um único baralho quando deckId é informado", async () => {
      loginAs("user-1");
      const matematica = (await listDecks("user-1", FIXED_NOW)).find(
        (deck) => deck.title === "Flashcards — Matemática",
      )!;

      const session = await getReviewSession("user-1", matematica.id, FIXED_NOW);
      expect(session.deckId).toBe(matematica.id);
      expect(session.totalDue).toBe(2);
      expect(session.cards.every((card) => card.deckId === matematica.id)).toBe(true);
    });

    it("rejeita um baralho pessoal de outro usuário (anti-IDOR)", async () => {
      loginAs("user-1");
      const personalDeck = (await listDecks("user-1", FIXED_NOW)).find((deck) => deck.type === "PERSONAL")!;

      authMock.mockResolvedValue(fakeSession("review-session-intruder"));
      await expect(
        getReviewSession("review-session-intruder", personalDeck.id, FIXED_NOW),
      ).rejects.toThrow();
    });
  });

  describe("reviewCard — algoritmo, pontuação e anti-farm", () => {
    it("cada classificação produz o próximo intervalo/data corretos (cartão novo)", async () => {
      const cases: Array<{ userId: string; cardId: string; rating: "AGAIN" | "HARD" | "GOOD" | "EASY"; days: number }> = [
        { userId: "review-again-1", cardId: "flashcard-direito-penal-01", rating: "AGAIN", days: 1 },
        { userId: "review-hard-1", cardId: "flashcard-direito-penal-02", rating: "HARD", days: 2 },
        { userId: "review-good-1", cardId: "flashcard-informatica-01", rating: "GOOD", days: 3 },
        { userId: "review-easy-1", cardId: "flashcard-informatica-02", rating: "EASY", days: 4 },
      ];

      for (const { userId, cardId, rating, days } of cases) {
        loginAs(userId);
        const card = await reviewCard(userId, cardId, rating, FIXED_NOW);
        expect(card.intervalDays).toBe(days);
        expect(card.nextReviewAt).toBe(new Date(FIXED_NOW.getTime() + days * 86_400_000).toISOString());
        expect(card.isDue).toBe(false); // acabou de ser revisado — não pode estar devido de novo já
        expect(card.lastReviewedAt).toBe(FIXED_NOW.toISOString());
      }
    });

    it("Errei não pontua; Difícil/Médio/Fácil pontuam (5 pontos, FlashcardCorrect)", async () => {
      loginAs("review-scoring-again");
      await reviewCard("review-scoring-again", "flashcard-direito-penal-01", "AGAIN", FIXED_NOW);
      const repos = getRepositories();
      expect((await repos.pointTransactions.listByUserId("review-scoring-again")).length).toBe(0);

      loginAs("review-scoring-good");
      await reviewCard("review-scoring-good", "flashcard-direito-penal-02", "GOOD", FIXED_NOW);
      const transactions = await repos.pointTransactions.listByUserId("review-scoring-good");
      expect(transactions.length).toBe(1);
      expect(transactions[0]!.points).toBe(5);
      expect(transactions[0]!.xp).toBe(5);
    });

    it("rejeita revisar um cartão antes de nextReviewAt chegar (anti-farm)", async () => {
      loginAs("user-1");
      // flashcard-lingua-portuguesa-02 já foi revisado (EASY) e só vence em 2026-07-17.
      await expect(reviewCard("user-1", "flashcard-lingua-portuguesa-02", "EASY", FIXED_NOW)).rejects.toThrow();
    });

    it("aceita revisar de novo assim que nextReviewAt chega", async () => {
      loginAs("review-due-boundary");
      const first = await reviewCard("review-due-boundary", "flashcard-raciocinio-logico-01", "AGAIN", FIXED_NOW);
      const exactlyDue = new Date(first.nextReviewAt!);
      const second = await reviewCard("review-due-boundary", "flashcard-raciocinio-logico-01", "GOOD", exactlyDue);
      expect(second.repetition).toBe(1);
    });

    it("idempotente por submissão — reprocessar o MESMO evento não credita pontos duas vezes", async () => {
      loginAs("review-idempotency-1");
      await reviewCard("review-idempotency-1", "flashcard-raciocinio-logico-02", "GOOD", FIXED_NOW);

      const repos = getRepositories();
      const review = await repos.flashcardReviews.findLatestByUserAndFlashcard(
        "review-idempotency-1",
        "flashcard-raciocinio-logico-02",
      );
      expect(review).not.toBeNull();
      expect((await repos.pointTransactions.listByUserId("review-idempotency-1")).length).toBe(1);

      // Reprocessa manualmente o MESMO evento (ex.: reentrega de fila/consumidor) — mesma
      // idempotencyKey (mesmo reviewId) NUNCA credita uma segunda vez.
      await eventBus.emit({
        type: "FlashcardCorrect",
        payload: { userId: "review-idempotency-1", flashcardId: "flashcard-raciocinio-logico-02", reviewId: review!.id },
        idempotencyKey: buildIdempotencyKey("FLASHCARD_CORRECT", "review-idempotency-1", review!.id),
        occurredAt: FIXED_NOW,
      });

      expect((await repos.pointTransactions.listByUserId("review-idempotency-1")).length).toBe(1);
    });

    it("rejeita revisar um cartão de um baralho pessoal de outro usuário (anti-IDOR)", async () => {
      loginAs("review-intruder-1");
      await expect(reviewCard("review-intruder-1", "flashcard-personal-01", "GOOD", FIXED_NOW)).rejects.toThrow();
    });

    it("rejeita quando o userId informado não bate com a sessão autenticada", async () => {
      loginAs("review-session-mismatch-actual");
      await expect(
        reviewCard("review-session-mismatch-claimed", "flashcard-direito-constitucional-01", "GOOD", FIXED_NOW),
      ).rejects.toThrow();
    });

    it("bloqueia farm por corrida — K revisões CONCORRENTES no mesmo cartão creditam pontos UMA vez (achado A1)", async () => {
      loginAs("review-concurrency-1");
      const repos = getRepositories();

      // 10 reviewCard concorrentes no MESMO cartão novo/devido. Sem o mutex por (userId,
      // flashcardId), todas leriam "sem revisão pendente", passariam o gate e creditariam 5 pts
      // cada (idempotencyKey por reviewId não deduplica). Com o mutex, só a 1ª cria a revisão;
      // as outras 9 reavaliam o gate já com a revisão gravada e caem em ConflictError.
      const results = await Promise.allSettled(
        Array.from({ length: 10 }, () =>
          reviewCard("review-concurrency-1", "flashcard-direito-penal-01", "GOOD", FIXED_NOW),
        ),
      );

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(9);
      for (const result of rejected) {
        if (result.status === "rejected") {
          expect((result.reason as { code?: string }).code).toBe("CONFLICT");
        }
      }

      // Exatamente 1 revisão gravada e 1 crédito de 5 pontos — nunca 10.
      const reviews = await repos.flashcardReviews.listByUserId("review-concurrency-1");
      expect(reviews.length).toBe(1);
      const transactions = await repos.pointTransactions.listByUserId("review-concurrency-1");
      expect(transactions.length).toBe(1);
      expect(transactions[0]!.points).toBe(5);
    });
  });

  describe("createDeck / createCard", () => {
    it("cria um baralho pessoal vazio", async () => {
      loginAs("deck-create-1");
      const deck = await createDeck("deck-create-1", { title: "Meu baralho" }, FIXED_NOW);
      expect(deck.type).toBe("PERSONAL");
      expect(deck.cardCount).toBe(0);
    });

    it("cria um cartão no baralho próprio", async () => {
      loginAs("card-create-1");
      const deck = await createDeck("card-create-1", { title: "Meu baralho" }, FIXED_NOW);
      const card = await createCard(
        "card-create-1",
        { deckId: deck.id, question: "Pergunta?", answer: "Resposta.", difficulty: "MEDIUM", tags: ["x"] },
        FIXED_NOW,
      );
      expect(card.deckId).toBe(deck.id);
      expect(card.tags).toEqual(["x"]);
      expect(card.isDue).toBe(true); // nunca revisado — devido imediatamente
    });

    it("rejeita criar cartão num baralho de outro usuário (anti-IDOR)", async () => {
      loginAs("card-owner-1");
      const deck = await createDeck("card-owner-1", { title: "Baralho do dono" }, FIXED_NOW);

      loginAs("card-intruder-1");
      await expect(
        createCard(
          "card-intruder-1",
          { deckId: deck.id, question: "Pergunta?", answer: "Resposta.", difficulty: "MEDIUM", tags: [] },
          FIXED_NOW,
        ),
      ).rejects.toThrow();
    });

    it("rejeita criar cartão num baralho de MATÉRIA (sistema) — só em baralho próprio", async () => {
      loginAs("card-subject-owner");
      const subjectDeck = (await listDecks("card-subject-owner", FIXED_NOW)).find((deck) => deck.type === "SUBJECT")!;

      await expect(
        createCard(
          "card-subject-owner",
          { deckId: subjectDeck.id, question: "Pergunta?", answer: "Resposta.", difficulty: "MEDIUM", tags: [] },
          FIXED_NOW,
        ),
      ).rejects.toThrow();
    });
  });

  describe("createFromErrors — puxa do caderno de erros (Fase 10)", () => {
    it("importa a questão errada ainda não convertida e não duplica a que já existia no seed", async () => {
      loginAs("user-1");
      const repos = getRepositories();
      const errorsDeck = (await listDecks("user-1", FIXED_NOW)).find((deck) => deck.type === "ERRORS")!;
      expect(errorsDeck.cardCount).toBe(1); // seed: só question-portugues-02 já importada

      const cards = await createFromErrors("user-1", FIXED_NOW);
      // user-1 errou 2 questões no seed (question-portugues-02 e question-administrativo-01,
      // ver src/mocks/data/mock-exam-attempts.ts) — só a 2ª ainda não tinha cartão.
      expect(cards.length).toBe(2);
      expect(cards.some((card) => card.question.includes("São atributos do ato administrativo"))).toBe(true);

      const afterCards = await repos.flashcards.listByDeckId((await repos.flashcardDecks.findById(errorsDeck.id))!.id);
      expect(afterCards.length).toBe(2);
    });

    it("é idempotente — chamar de novo não duplica nenhum cartão", async () => {
      loginAs("user-1");
      const first = await createFromErrors("user-1", FIXED_NOW);
      const second = await createFromErrors("user-1", FIXED_NOW);
      expect(second.length).toBe(first.length);
    });
  });

  describe("createFromNotes — puxa dos rascunhos do brainstorm (Fase 13)", () => {
    it("importa um rascunho novo e não duplica ao repetir", async () => {
      loginAs("user-1");
      const before = await createFromNotes("user-1", FIXED_NOW); // só o cartão do seed (sem rascunho correspondente)
      expect(before.length).toBe(1);

      createFlashcardDraft("user-1", "brainstorm-card-x", "Pergunta do brainstorm?", "Resposta do brainstorm.", FIXED_NOW);

      const afterFirstImport = await createFromNotes("user-1", FIXED_NOW);
      expect(afterFirstImport.length).toBe(2);
      expect(afterFirstImport.some((card) => card.question === "Pergunta do brainstorm?")).toBe(true);

      const afterSecondImport = await createFromNotes("user-1", FIXED_NOW);
      expect(afterSecondImport.length).toBe(2); // não duplicou
    });
  });

  describe("toggleFavorite", () => {
    it("favorita/desfavorita um cartão de MATÉRIA (compartilhado) sem vazar para outro usuário", async () => {
      loginAs("fav-user-a");
      const subjectDeck = (await listDecks("fav-user-a", FIXED_NOW)).find((deck) => deck.type === "SUBJECT")!;
      const repos = getRepositories();
      const [sharedCard] = await repos.flashcards.listByDeckId(subjectDeck.id);

      const toggledOn = await toggleFavorite("fav-user-a", sharedCard!.id, FIXED_NOW);
      expect(toggledOn.isFavorite).toBe(true);

      const decksForA = await listDecks("fav-user-a", FIXED_NOW);
      expect(decksForA.find((deck) => deck.type === "FAVORITES")!.cardCount).toBe(1);

      loginAs("fav-user-b");
      const decksForB = await listDecks("fav-user-b", FIXED_NOW);
      expect(decksForB.find((deck) => deck.type === "FAVORITES")!.cardCount).toBe(0); // isolado por usuário

      loginAs("fav-user-a");
      const toggledOff = await toggleFavorite("fav-user-a", sharedCard!.id, FIXED_NOW);
      expect(toggledOff.isFavorite).toBe(false);
    });

    it("rejeita favoritar um cartão de baralho pessoal de outro usuário (anti-IDOR)", async () => {
      loginAs("fav-intruder-1");
      await expect(toggleFavorite("fav-intruder-1", "flashcard-personal-01", FIXED_NOW)).rejects.toThrow();
    });
  });

  describe("getRetentionStats", () => {
    it("agrega histórico completo de revisões do usuário", async () => {
      loginAs("user-1");
      const stats = await getRetentionStats("user-1", FIXED_NOW);

      expect(stats.totalReviews).toBe(4);
      expect(stats.correctReviews).toBe(3); // GOOD + EASY + HARD (AGAIN não conta)
      expect(stats.retentionPercent).toBe(75);
      expect(stats.cardsReviewedAtLeastOnce).toBe(4);
      expect(stats.totalCards).toBe(20);
      expect(stats.dueNowCount).toBe(19);
    });
  });
});
