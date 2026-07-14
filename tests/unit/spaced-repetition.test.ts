import { describe, expect, it } from "vitest";
import {
  addIntervalDays,
  computeNextReview,
  isCorrectRating,
  NEW_CARD_STATE,
  type SpacedRepetitionState,
} from "@/server/services/flashcards/spaced-repetition";

/**
 * Testes do algoritmo PURO de repetição espaçada ("SM-2 simplificado", Fase 14 — CLAUDE.md
 * §19/§25). Ver a fórmula completa/exemplos em `docs/FLASHCARDS.md` e no cabeçalho de
 * `@/server/services/flashcards/spaced-repetition.ts`.
 */
describe("services/flashcards/spaced-repetition", () => {
  describe("computeNextReview — Errei (AGAIN) sempre reinicia", () => {
    it("reinicia a partir de um cartão novo", () => {
      const next = computeNextReview(NEW_CARD_STATE, "AGAIN");
      expect(next).toEqual({ repetition: 0, easeFactor: 2.3, intervalDays: 1 });
    });

    it("reinicia mesmo vindo de um estado avançado (repetition alto, intervalo alto)", () => {
      const advanced: SpacedRepetitionState = { easeFactor: 2.8, intervalDays: 40, repetition: 5 };
      const next = computeNextReview(advanced, "AGAIN");
      expect(next.repetition).toBe(0);
      expect(next.intervalDays).toBe(1);
      expect(next.easeFactor).toBeCloseTo(2.6, 5);
    });

    it("nunca deixa o easeFactor abaixo do mínimo (1.3)", () => {
      const lowEase: SpacedRepetitionState = { easeFactor: 1.35, intervalDays: 1, repetition: 0 };
      const next = computeNextReview(lowEase, "AGAIN");
      expect(next.easeFactor).toBeCloseTo(1.3, 5);

      const alreadyAtFloor: SpacedRepetitionState = { easeFactor: 1.3, intervalDays: 1, repetition: 0 };
      expect(computeNextReview(alreadyAtFloor, "AGAIN").easeFactor).toBe(1.3);
    });
  });

  describe("computeNextReview — cartão novo (primeiro contato)", () => {
    it("produz os valores documentados para cada classificação (docs/FLASHCARDS.md §2.2)", () => {
      expect(computeNextReview(NEW_CARD_STATE, "AGAIN")).toEqual({
        repetition: 0,
        easeFactor: 2.3,
        intervalDays: 1,
      });
      expect(computeNextReview(NEW_CARD_STATE, "HARD")).toEqual({
        repetition: 1,
        easeFactor: 2.35,
        intervalDays: 2,
      });
      expect(computeNextReview(NEW_CARD_STATE, "GOOD")).toEqual({
        repetition: 1,
        easeFactor: 2.5,
        intervalDays: 3,
      });
      expect(computeNextReview(NEW_CARD_STATE, "EASY")).toEqual({
        repetition: 1,
        easeFactor: 2.65,
        intervalDays: 4,
      });
    });

    it("ordena estritamente Fácil > Médio > Difícil > Errei a partir do MESMO estado", () => {
      const again = computeNextReview(NEW_CARD_STATE, "AGAIN").intervalDays;
      const hard = computeNextReview(NEW_CARD_STATE, "HARD").intervalDays;
      const good = computeNextReview(NEW_CARD_STATE, "GOOD").intervalDays;
      const easy = computeNextReview(NEW_CARD_STATE, "EASY").intervalDays;

      expect(easy).toBeGreaterThan(good);
      expect(good).toBeGreaterThan(hard);
      expect(hard).toBeGreaterThan(again);
    });
  });

  describe("computeNextReview — segunda repetição (passo fixo)", () => {
    it("usa os passos fixos documentados (docs/FLASHCARDS.md §2) quando repetition chega a 2", () => {
      const afterFirstGood = computeNextReview(NEW_CARD_STATE, "GOOD"); // repetition 1, interval 3
      const second = computeNextReview(afterFirstGood, "GOOD");
      expect(second).toEqual({ repetition: 2, easeFactor: 2.5, intervalDays: 6 });

      const afterFirstHard = computeNextReview(NEW_CARD_STATE, "HARD");
      const secondHard = computeNextReview(afterFirstHard, "HARD");
      expect(secondHard.intervalDays).toBe(4);

      const afterFirstEasy = computeNextReview(NEW_CARD_STATE, "EASY");
      const secondEasy = computeNextReview(afterFirstEasy, "EASY");
      expect(secondEasy.intervalDays).toBe(9);
    });
  });

  describe("computeNextReview — repetition >= 3 (crescimento multiplicativo)", () => {
    it("cresce por round(intervalo anterior * ease * fator) — sequência Médio, Médio, Médio", () => {
      let state = NEW_CARD_STATE;
      state = computeNextReview(state, "GOOD"); // rep 1, interval 3
      state = computeNextReview(state, "GOOD"); // rep 2, interval 6
      state = computeNextReview(state, "GOOD"); // rep 3, interval round(6*2.5*1.0)=15
      expect(state).toEqual({ repetition: 3, easeFactor: 2.5, intervalDays: 15 });

      state = computeNextReview(state, "GOOD"); // rep 4, interval round(15*2.5*1.0)=38
      expect(state.intervalDays).toBe(38);
    });

    it("um Errei no meio da sequência reinicia — a próxima Médio NÃO continua de onde parou", () => {
      let state = NEW_CARD_STATE;
      state = computeNextReview(state, "GOOD"); // rep 1, interval 3
      state = computeNextReview(state, "GOOD"); // rep 2, interval 6

      const afterAgain = computeNextReview(state, "AGAIN");
      expect(afterAgain).toEqual({ repetition: 0, easeFactor: 2.3, intervalDays: 1 });

      const nextGood = computeNextReview(afterAgain, "GOOD");
      expect(nextGood).toEqual({ repetition: 1, easeFactor: 2.3, intervalDays: 3 }); // passo fixo de novo
    });

    it("nunca deixa o easeFactor acima do máximo (3.0) numa sequência longa de Fácil", () => {
      let state: SpacedRepetitionState = { easeFactor: 2.95, intervalDays: 10, repetition: 3 };
      state = computeNextReview(state, "EASY");
      expect(state.easeFactor).toBe(3.0);
      state = computeNextReview(state, "EASY");
      expect(state.easeFactor).toBe(3.0); // já no teto — não ultrapassa
    });

    it("o intervalo nunca é menor que 1 dia mesmo com fator reduzido (Difícil)", () => {
      const state: SpacedRepetitionState = { easeFactor: 1.3, intervalDays: 1, repetition: 3 };
      const next = computeNextReview(state, "HARD");
      expect(next.intervalDays).toBeGreaterThanOrEqual(1);
    });
  });

  describe("isCorrectRating", () => {
    it("Errei não conta como acerto; Difícil/Médio/Fácil contam", () => {
      expect(isCorrectRating("AGAIN")).toBe(false);
      expect(isCorrectRating("HARD")).toBe(true);
      expect(isCorrectRating("GOOD")).toBe(true);
      expect(isCorrectRating("EASY")).toBe(true);
    });
  });

  describe("addIntervalDays", () => {
    it("soma dias corridos exatos, preservando hora/minuto (não trunca à meia-noite)", () => {
      const now = new Date("2026-07-14T15:30:00.000Z");
      expect(addIntervalDays(now, 1).toISOString()).toBe("2026-07-15T15:30:00.000Z");
      expect(addIntervalDays(now, 3).toISOString()).toBe("2026-07-17T15:30:00.000Z");
      expect(addIntervalDays(now, 0).toISOString()).toBe(now.toISOString());
    });
  });
});
