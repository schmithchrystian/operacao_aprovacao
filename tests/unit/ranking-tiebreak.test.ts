import { describe, expect, it } from "vitest";
import { compareRankingEntries, type RankingTieBreakInput } from "@/server/services/gamification/ranking/tiebreak";

/**
 * Testes do desempate determinístico do ranking (Fase 9 — CLAUDE.md §17): score > aproveitamento
 * > aulas concluídas > menor tempo para pontuar > `userId` — nunca indefinido.
 */
describe("ranking/tiebreak — compareRankingEntries", () => {
  const base: RankingTieBreakInput = {
    userId: "user-a",
    score: 0.5,
    mockExamPerformance: 70,
    lessonsCompleted: 20,
    timeToScoreMs: 1_000,
  };

  it("maior score vence, independente dos demais critérios", () => {
    const higher: RankingTieBreakInput = { ...base, userId: "user-b", score: 0.9, mockExamPerformance: 0, lessonsCompleted: 0, timeToScoreMs: 999_999 };
    expect(compareRankingEntries(higher, base)).toBeLessThan(0);
    expect(compareRankingEntries(base, higher)).toBeGreaterThan(0);
  });

  it("score empatado: maior aproveitamento em simulados vence", () => {
    const betterAccuracy: RankingTieBreakInput = { ...base, userId: "user-b", mockExamPerformance: 90 };
    expect(compareRankingEntries(betterAccuracy, base)).toBeLessThan(0);
  });

  it("score e aproveitamento empatados: mais aulas concluídas vence", () => {
    const moreLessons: RankingTieBreakInput = { ...base, userId: "user-b", lessonsCompleted: 50 };
    expect(compareRankingEntries(moreLessons, base)).toBeLessThan(0);
  });

  it("score, aproveitamento e aulas empatados: menor tempo para pontuar vence", () => {
    const faster: RankingTieBreakInput = { ...base, userId: "user-b", timeToScoreMs: 100 };
    expect(compareRankingEntries(faster, base)).toBeLessThan(0);
  });

  it("tudo empatado: menor userId vence (desempate final estável, nunca 0 para userIds diferentes)", () => {
    const other: RankingTieBreakInput = { ...base, userId: "user-z" };
    expect(compareRankingEntries(base, other)).toBeLessThan(0); // "user-a" < "user-z"
    expect(compareRankingEntries(other, base)).toBeGreaterThan(0);
  });

  it("entradas idênticas (mesmo userId) comparam como iguais", () => {
    expect(compareRankingEntries(base, { ...base })).toBe(0);
  });

  it("resultado é determinístico e estável ao ordenar uma lista", () => {
    const list: RankingTieBreakInput[] = [
      { ...base, userId: "user-c", score: 0.5 },
      { ...base, userId: "user-a", score: 0.5 },
      { ...base, userId: "user-b", score: 0.5 },
    ];
    const sortedOnce = [...list].sort(compareRankingEntries).map((e) => e.userId);
    const sortedTwice = [...list].sort(compareRankingEntries).map((e) => e.userId);
    expect(sortedOnce).toEqual(sortedTwice);
    expect(sortedOnce).toEqual(["user-a", "user-b", "user-c"]); // tudo empatado -> ordem por userId
  });
});
