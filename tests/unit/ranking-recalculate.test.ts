import { beforeEach, describe, expect, it, vi } from "vitest";

// `recalculate.ts` importa `auditLog` de `@/server/audit`, cujo barrel reexporta
// `with-admin-audit.ts` -> `@/server/authorization` -> `@/server/auth` (Auth.js). Mockar ANTES
// de importar o módulo sob teste — mesmo padrão de `tests/unit/gamification-engine.test.ts`
// (o recálculo em si NUNCA chama `auth()`/sessão de usuário).
vi.mock("@/server/auth", () => ({ auth: vi.fn() }));

const { mockRankingParticipants } = await import("@/mocks");
const { getRepositories } = await import("@/server/repositories");
const { __resetMockRankingScoreStore } = await import("@/server/repositories/mock/ranking-score-repository");
const { recalculateAllRankingScopes, recalculateRankingForScope } = await import(
  "@/server/services/gamification/ranking/recalculate"
);

/**
 * Testes do recálculo/materialização do ranking (Fase 9 — CLAUDE.md §17, ADR-0009):
 * - recalcular 2x com os MESMOS dados de entrada produz o mesmo score/rank por usuário, sem
 *   duplicar linhas (idempotência real, não só "não lança erro");
 * - escopos (GLOBAL/CONTEST/COURSE/CITY/STATE) filtram corretamente os participantes;
 * - escopo vazio não lança e materializa zero linhas.
 */
describe("ranking/recalculate — recalculateRankingForScope", () => {
  const referenceDate = new Date("2026-06-01T00:00:00.000Z");

  beforeEach(() => {
    __resetMockRankingScoreStore();
  });

  it("recalcular a mesma versão 2x é idempotente: mesmas linhas, mesmo score/rank (nunca duplica)", async () => {
    const first = await recalculateRankingForScope({
      periodType: "ALL_TIME",
      scopeType: "CONTEST",
      scopeKeyRaw: "contest-pm-soldado",
      referenceDate,
      calculationVersion: 1,
    });
    expect(first.participantCount).toBeGreaterThan(0);

    const repos = getRepositories();
    const rowsAfterFirst = await repos.rankingScores.listByScopeAndVersion(
      "ALL_TIME",
      "all",
      "CONTEST",
      "contest:contest-pm-soldado",
      1,
    );
    expect(rowsAfterFirst).toHaveLength(first.participantCount);

    const second = await recalculateRankingForScope({
      periodType: "ALL_TIME",
      scopeType: "CONTEST",
      scopeKeyRaw: "contest-pm-soldado",
      referenceDate,
      calculationVersion: 1,
    });
    expect(second).toEqual(first);

    const rowsAfterSecond = await repos.rankingScores.listByScopeAndVersion(
      "ALL_TIME",
      "all",
      "CONTEST",
      "contest:contest-pm-soldado",
      1,
    );
    // Mesma quantidade de linhas (não duplicou) e mesmo score/rank por usuário.
    expect(rowsAfterSecond).toHaveLength(rowsAfterFirst.length);
    const byUserFirst = new Map(rowsAfterFirst.map((r) => [r.userId, r]));
    for (const row of rowsAfterSecond) {
      const previous = byUserFirst.get(row.userId)!;
      expect(row.score).toBeCloseTo(previous.score, 10);
      expect(row.rank).toBe(previous.rank);
    }
  });

  it("escopo CONTEST só inclui participantes do concurso informado", async () => {
    await recalculateRankingForScope({
      periodType: "ALL_TIME",
      scopeType: "CONTEST",
      scopeKeyRaw: "contest-gcm-agente",
      referenceDate,
    });

    const repos = getRepositories();
    const rows = await repos.rankingScores.listByScopeAndVersion(
      "ALL_TIME",
      "all",
      "CONTEST",
      "contest:contest-gcm-agente",
      1,
    );
    const expectedUserIds = new Set(
      mockRankingParticipants.filter((p) => p.contestId === "contest-gcm-agente").map((p) => p.userId),
    );
    expect(rows.length).toBe(expectedUserIds.size);
    expect(rows.every((row) => expectedUserIds.has(row.userId))).toBe(true);
  });

  it("escopo GLOBAL inclui todos os participantes do dataset", async () => {
    await recalculateRankingForScope({ periodType: "ALL_TIME", scopeType: "GLOBAL", scopeKeyRaw: "global", referenceDate });

    const repos = getRepositories();
    const rows = await repos.rankingScores.listByScopeAndVersion("ALL_TIME", "all", "GLOBAL", "global", 1);
    expect(rows).toHaveLength(mockRankingParticipants.length);
    // Rank é uma permutação de 1..N (sem lacunas nem repetição).
    const ranks = rows.map((r) => r.rank).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(ranks).toEqual(Array.from({ length: mockRankingParticipants.length }, (_, i) => i + 1));
  });

  it("escopo sem nenhum participante correspondente materializa zero linhas sem lançar", async () => {
    const result = await recalculateRankingForScope({
      periodType: "ALL_TIME",
      scopeType: "CONTEST",
      scopeKeyRaw: "contest-que-nao-existe",
      referenceDate,
    });
    expect(result.participantCount).toBe(0);

    const repos = getRepositories();
    const rows = await repos.rankingScores.listByScopeAndVersion(
      "ALL_TIME",
      "all",
      "CONTEST",
      "contest:contest-que-nao-existe",
      1,
    );
    expect(rows).toHaveLength(0);
  });

  it("recalculateAllRankingScopes cobre GLOBAL + concursos/cursos/cidades/estados observados nos períodos default", async () => {
    const summary = await recalculateAllRankingScopes(referenceDate);
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.some((s) => s.periodType === "WEEKLY" && s.scopeType === "GLOBAL")).toBe(true);
    expect(summary.some((s) => s.periodType === "MONTHLY" && s.scopeType === "GLOBAL")).toBe(true);
    expect(summary.some((s) => s.periodType === "ALL_TIME" && s.scopeType === "GLOBAL")).toBe(true);
  });
});
