import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { inRepositoryTransaction } from "@/server/repositories/transaction";
import { withDomainLock } from "@/server/concurrency/domain-lock";
import { PrismaBrainstormBoardRepository } from "@/server/repositories/prisma/brainstorm-board-repository";
import { PrismaBrainstormColumnRepository } from "@/server/repositories/prisma/brainstorm-column-repository";
import { PrismaBrainstormCardRepository } from "@/server/repositories/prisma/brainstorm-card-repository";
import { PrismaFlashcardDeckRepository } from "@/server/repositories/prisma/flashcard-deck-repository";
import { PrismaFlashcardRepository } from "@/server/repositories/prisma/flashcard-repository";
import { PrismaFlashcardReviewRepository } from "@/server/repositories/prisma/flashcard-review-repository";
import {
  getFavoriteFlashcardIds,
  toggleFavorite,
} from "@/server/services/flashcards/favorite-store";

const now = new Date();
const prefix = "learning-test-" + randomUUID();
let userId: string;
let boardId: string;
let deckId: string;
let cardId: string;
const boards = new PrismaBrainstormBoardRepository(),
  columns = new PrismaBrainstormColumnRepository(),
  cards = new PrismaBrainstormCardRepository();
const decks = new PrismaFlashcardDeckRepository(),
  flashcards = new PrismaFlashcardRepository(),
  reviews = new PrismaFlashcardReviewRepository();
describe("learning tools on native PostgreSQL", () => {
  beforeAll(async () => {
    userId = (
      await prisma.user.create({
        data: {
          email: prefix + "@example.invalid",
          name: prefix,
          passwordHash: "not-a-login-hash",
        },
      })
    ).id;
  });
  afterAll(async () => {
    if (!userId) return;
    await prisma.flashcardDeck.deleteMany({ where: { userId } });
    await prisma.brainstormBoard.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });
  it("persists boards, ordered columns and scoped card movement", async () => {
    const board = await boards.create({ userId, title: prefix, now });
    boardId = board.id;
    const cols = await columns.createMany([
      { boardId, name: "Ideas", order: 0, now },
      { boardId, name: "Done", order: 1, now },
    ]);
    expect((await boards.listByUserId(userId)).map((r) => r.id)).toContain(boardId);
    const c = await cards.create({
      columnId: cols[0]!.id,
      type: "IDEIA",
      title: "Question",
      content: "Answer",
      tags: [],
      subjectId: null,
      topicId: null,
      priority: "MEDIUM",
      order: 0,
      now,
    });
    await inRepositoryTransaction(async () => {
      await cards.moveToColumn(c.id, cols[1]!.id, now);
      await cards.reorderColumn(cols[1]!.id, [c.id], now);
    });
    expect((await cards.findById(c.id))?.columnId).toBe(cols[1]!.id);
    await expect(
      inRepositoryTransaction(async () => {
        await cards.moveToColumn(c.id, cols[0]!.id, now);
        throw Error("injected failure");
      }),
    ).rejects.toThrow("injected");
    expect((await cards.findById(c.id))?.columnId).toBe(cols[1]!.id);
    const other = await boards.create({ userId, title: "Other", now });
    const [otherCol] = await columns.createMany([
      { boardId: other.id, name: "other", order: 0, now },
    ]);
    await expect(cards.moveToColumn(c.id, otherCol!.id, now)).rejects.toThrow("Destino");
    await cards.delete(c.id);
    expect(await cards.findById(c.id)).toBeNull();
  });
  it("creates one notes deck under concurrent requests and preserves card fields", async () => {
    const result = await Promise.all(
      Array.from({ length: 4 }, () =>
        decks.create({
          userId,
          subjectId: null,
          title: "Notes",
          isPublic: false,
          kind: "NOTES",
          now,
        }),
      ),
    );
    expect(new Set(result.map((r) => r.id)).size).toBe(1);
    deckId = result[0]!.id;
    const c = await flashcards.create({
      deckId,
      subjectId: null,
      topicId: null,
      question: "Q",
      answer: "A",
      difficulty: "MEDIUM",
      tags: ["review"],
      now,
    });
    cardId = c.id;
    expect((await flashcards.findById(cardId))?.answer).toBe("A");
    expect((await flashcards.listByDeckIds([deckId])).length).toBe(1);
  });
  it("stores favorites by user and removes them atomically", async () => {
    expect(await toggleFavorite(userId, cardId, now)).toBe(true);
    expect(await getFavoriteFlashcardIds(userId)).toEqual([cardId]);
    expect(await getFavoriteFlashcardIds("unknown-user")).toEqual([]);
    expect(await toggleFavorite(userId, cardId, now)).toBe(false);
  });
  it("serializes review eligibility and history across concurrent transactions", async () => {
    const result = await Promise.all(
      Array.from({ length: 4 }, () =>
        withDomainLock(`review:${userId}:${cardId}`, async () => {
          const previous = await reviews.findLatestByUserAndFlashcard(userId, cardId);
          if (previous) return false;
          await reviews.create({
            userId,
            flashcardId: cardId,
            rating: "GOOD",
            intervalDays: 1,
            easeFactor: 2.5,
            repetition: 1,
            nextReviewAt: new Date(now.getTime() + 86400000).toISOString(),
            now,
          });
          return true;
        }),
      ),
    );
    expect(result.filter(Boolean)).toHaveLength(1);
    expect(await reviews.listByUserId(userId)).toHaveLength(1);
    expect((await reviews.listLatestByUserIdForFlashcardIds(userId, [cardId]))[0]!.rating).toBe(
      "GOOD",
    );
  });
});
