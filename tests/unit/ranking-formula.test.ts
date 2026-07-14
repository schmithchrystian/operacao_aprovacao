import { describe, expect, it } from "vitest";
import {
  computeRankingScores,
  normalizeMinMax,
  type RankingRawMetrics,
} from "@/server/services/gamification/ranking/formula";

/**
 * Testes da fórmula/normalização do ranking (Fase 9 — CLAUDE.md §17):
 * - `normalizeMinMax` nunca gera `NaN` quando não há variância (todos iguais);
 * - a normalização impede que uma métrica de valor absoluto extremo ("farm" de uma única
 *   métrica) domine o score composto sozinha — é o requisito central do §17 ("não utilizar
 *   somente pontos totais").
 */
describe("ranking/formula — normalizeMinMax", () => {
  it("normaliza linearmente para 0-1 dentro do conjunto", () => {
    expect(normalizeMinMax([0, 50, 100])).toEqual([0, 0.5, 1]);
  });

  it("quando não há variância (todos os valores iguais), devolve 0 para todos (nunca NaN)", () => {
    expect(normalizeMinMax([42, 42, 42])).toEqual([0, 0, 0]);
  });

  it("lista vazia devolve lista vazia", () => {
    expect(normalizeMinMax([])).toEqual([]);
  });
});

describe("ranking/formula — computeRankingScores (anti-dominância)", () => {
  it("um participante com métrica única extrema ('farm') não vence quem é equilibrado nas 5 métricas", () => {
    const entries: Array<{ participant: string; metrics: RankingRawMetrics }> = [
      {
        participant: "farmer",
        metrics: { mockExamPerformance: 0, lessonsCompleted: 100_000, consistency: 0, validHours: 0, goalsCompleted: 0 },
      },
      {
        participant: "balanced",
        metrics: { mockExamPerformance: 80, lessonsCompleted: 50, consistency: 0.8, validHours: 40, goalsCompleted: 8 },
      },
      {
        participant: "low",
        metrics: { mockExamPerformance: 20, lessonsCompleted: 10, consistency: 0.2, validHours: 5, goalsCompleted: 1 },
      },
    ];

    const scored = computeRankingScores(entries);
    const byParticipant = new Map(scored.map((entry) => [entry.participant, entry]));

    const farmer = byParticipant.get("farmer")!;
    const balanced = byParticipant.get("balanced")!;
    const low = byParticipant.get("low")!;

    // O "farmer" domina a métrica de aulas concluídas (normalizada ~1) mas fica zerado nas
    // outras 4 (peso combinado 0.75) — não pode superar quem tem bom desempenho geral.
    expect(farmer.breakdown.lessonsCompleted.normalized).toBeGreaterThan(0.99);
    expect(balanced.score).toBeGreaterThan(farmer.score);
    expect(farmer.score).toBeGreaterThan(low.score);

    // A contribuição isolada da métrica dominada nunca excede o peso configurado dela.
    expect(farmer.breakdown.lessonsCompleted.contribution).toBeLessThanOrEqual(farmer.breakdown.lessonsCompleted.weight);
    expect(farmer.score).toBeLessThanOrEqual(farmer.breakdown.lessonsCompleted.weight + 1e-9);
  });

  it("o score é a soma ponderada das contribuições normalizadas (breakdown consistente)", () => {
    const entries: Array<{ participant: string; metrics: RankingRawMetrics }> = [
      { participant: "a", metrics: { mockExamPerformance: 10, lessonsCompleted: 1, consistency: 0.1, validHours: 1, goalsCompleted: 1 } },
      { participant: "b", metrics: { mockExamPerformance: 90, lessonsCompleted: 9, consistency: 0.9, validHours: 9, goalsCompleted: 9 } },
    ];

    const scored = computeRankingScores(entries);
    const a = scored[0]!;
    const b = scored[1]!;
    const sumContributions = (breakdown: (typeof a)["breakdown"]) =>
      breakdown.mockExamPerformance.contribution +
      breakdown.lessonsCompleted.contribution +
      breakdown.consistency.contribution +
      breakdown.validHours.contribution +
      breakdown.goalsCompleted.contribution;

    expect(a!.score).toBeCloseTo(sumContributions(a!.breakdown), 10);
    expect(b!.score).toBeCloseTo(sumContributions(b!.breakdown), 10);
    expect(a!.score).toBe(0); // pior em tudo -> normalizado 0 em tudo -> score 0
    expect(b!.score).toBeCloseTo(1, 10); // melhor em tudo -> normalizado 1 em tudo -> score = soma dos pesos = 1
  });

  it("conjunto vazio devolve lista vazia", () => {
    expect(computeRankingScores([])).toEqual([]);
  });
});
