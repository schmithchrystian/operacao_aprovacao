import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

// `ranking/read.ts` -> `@/server/authorization` -> `@/server/auth` (Auth.js). Mockar ANTES de
// importar o módulo sob teste — mesmo padrão de `tests/unit/gamification-engine.test.ts`.
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));

const { getRanking } = await import("@/server/services/gamification/ranking/read");
const { recalculateRankingForScope } = await import("@/server/services/gamification/ranking/recalculate");
const { mockRankingParticipants } = await import("@/mocks");
const { getRepositories } = await import("@/server/repositories");
const { __resetMockRankingScoreStore } = await import("@/server/repositories/mock/ranking-score-repository");
const { RANKING_PAGE_SIZE } = await import("@/config/business");

function fakeSession(id: string): NextAuthSession {
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

/**
 * Testes da leitura do ranking (Fase 9 — CLAUDE.md §17):
 * - `showInRanking = false` remove o participante das listagens públicas;
 * - o próprio usuário (mesmo opt-out) sempre recebe sua posição real via `currentUser`;
 * - a posição do usuário atual é devolvida mesmo fora da página solicitada;
 * - autenticação é exigida (sem sessão, `getRanking` rejeita).
 */
describe("ranking/read — getRanking", () => {
  const referenceDate = new Date("2026-06-01T00:00:00.000Z");

  beforeEach(async () => {
    authMock.mockReset();
    __resetMockRankingScoreStore();
    await recalculateRankingForScope({
      periodType: "ALL_TIME",
      scopeType: "GLOBAL",
      scopeKeyRaw: "global",
      referenceDate,
    });
  });

  it("exige sessão autenticada", async () => {
    authMock.mockResolvedValue(null);
    await expect(
      getRanking({ periodType: "ALL_TIME", scopeType: "GLOBAL", scopeKeyRaw: "global", referenceDate }),
    ).rejects.toThrow();
  });

  it("participante com showInRanking=false não aparece nas listagens públicas de outro usuário", async () => {
    const optedOut = mockRankingParticipants.find((p) => !p.showInRanking);
    expect(optedOut).toBeDefined();

    const otherUser = mockRankingParticipants.find((p) => p.showInRanking && p.userId !== optedOut!.userId)!;
    authMock.mockResolvedValue(fakeSession(otherUser.userId));

    const result = await getRanking({
      periodType: "ALL_TIME",
      scopeType: "GLOBAL",
      scopeKeyRaw: "global",
      referenceDate,
      page: 1,
    });

    expect(result.items.some((entry) => entry.userId === optedOut!.userId)).toBe(false);
    expect(result.top3.some((entry) => entry.userId === optedOut!.userId)).toBe(false);

    const visibleCount = mockRankingParticipants.filter((p) => p.showInRanking).length;
    expect(result.total).toBe(visibleCount);
  });

  it("o próprio usuário com opt-out ainda recebe sua posição real em currentUser", async () => {
    const optedOut = mockRankingParticipants.find((p) => !p.showInRanking)!;
    authMock.mockResolvedValue(fakeSession(optedOut.userId));

    const result = await getRanking({
      periodType: "ALL_TIME",
      scopeType: "GLOBAL",
      scopeKeyRaw: "global",
      referenceDate,
      page: 1,
    });

    expect(result.currentUser).not.toBeNull();
    expect(result.currentUser!.userId).toBe(optedOut.userId);
    expect(result.currentUser!.position).toBeGreaterThan(0);
    // Continua fora da listagem pública mesmo sendo ele mesmo a consultar.
    expect(result.items.some((entry) => entry.userId === optedOut.userId)).toBe(false);
  });

  it("devolve a posição do usuário atual mesmo quando ela está fora da página solicitada", async () => {
    const repos = getRepositories();
    const rows = await repos.rankingScores.listByScopeAndVersion("ALL_TIME", "all", "GLOBAL", "global", 1);
    const participantsById = new Map(mockRankingParticipants.map((p) => [p.userId, p]));

    const visibleSorted = [...rows]
      .filter((row) => participantsById.get(row.userId)?.showInRanking !== false)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

    // Alguém posicionado além da 1ª página (índice >= RANKING_PAGE_SIZE na listagem visível).
    const offPageEntry = visibleSorted[RANKING_PAGE_SIZE + 2];
    expect(offPageEntry).toBeDefined();

    authMock.mockResolvedValue(fakeSession(offPageEntry!.userId));
    const page1 = await getRanking({
      periodType: "ALL_TIME",
      scopeType: "GLOBAL",
      scopeKeyRaw: "global",
      referenceDate,
      page: 1,
    });

    expect(page1.items).toHaveLength(RANKING_PAGE_SIZE);
    expect(page1.items.some((entry) => entry.userId === offPageEntry!.userId)).toBe(false);
    expect(page1.currentUser).not.toBeNull();
    expect(page1.currentUser!.userId).toBe(offPageEntry!.userId);
    expect(page1.currentUser!.position).toBe(offPageEntry!.rank);
  });

  it("FAIL-CLOSED: RankingScore sem participante resolvido não aparece na lista pública, mas o próprio usuário ainda vê sua posição", async () => {
    // Simula uma linha materializada cujo userId NÃO tem participante/perfil resolvido em
    // `mockRankingParticipants` (perfil ausente/inconsistente). Fail-closed: nunca deve vazar
    // na listagem pública de terceiros — mas o próprio usuário deve ver sua posição.
    const repos = getRepositories();
    const orphanUserId = "orphan-user-sem-perfil";
    await repos.rankingScores.upsert({
      userId: orphanUserId,
      periodType: "ALL_TIME",
      periodKey: "all",
      scopeType: "GLOBAL",
      scopeKey: "global",
      calculationVersion: 1,
      score: 0.999, // score alto de propósito: entraria no topo se não fosse fail-closed
      rank: 1,
      breakdown: null,
      now: referenceDate,
    });

    // (a) um TERCEIRO (perfil resolvido) consultando NÃO vê a linha órfã em items nem top3.
    const otherUser = mockRankingParticipants.find((p) => p.showInRanking)!;
    authMock.mockResolvedValue(fakeSession(otherUser.userId));
    const asOther = await getRanking({
      periodType: "ALL_TIME",
      scopeType: "GLOBAL",
      scopeKeyRaw: "global",
      referenceDate,
      page: 1,
    });
    expect(asOther.items.some((entry) => entry.userId === orphanUserId)).toBe(false);
    expect(asOther.top3.some((entry) => entry.userId === orphanUserId)).toBe(false);

    // (b) o PRÓPRIO usuário órfão consultando ainda recebe sua posição real em currentUser,
    // mas continua fora da listagem pública.
    authMock.mockResolvedValue(fakeSession(orphanUserId));
    const asSelf = await getRanking({
      periodType: "ALL_TIME",
      scopeType: "GLOBAL",
      scopeKeyRaw: "global",
      referenceDate,
      page: 1,
    });
    expect(asSelf.currentUser).not.toBeNull();
    expect(asSelf.currentUser!.userId).toBe(orphanUserId);
    expect(asSelf.currentUser!.position).toBe(1);
    expect(asSelf.items.some((entry) => entry.userId === orphanUserId)).toBe(false);
  });

  it("top3 reflete as 3 melhores posições públicas (visíveis)", async () => {
    authMock.mockResolvedValue(fakeSession("user-1"));
    const result = await getRanking({ periodType: "ALL_TIME", scopeType: "GLOBAL", scopeKeyRaw: "global", referenceDate });

    expect(result.top3.length).toBeLessThanOrEqual(3);
    const positions = result.top3.map((entry) => entry.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("escopo/período nunca calculado devolve resultado vazio (sem lançar)", async () => {
    authMock.mockResolvedValue(fakeSession("user-1"));
    const result = await getRanking({
      periodType: "DAILY",
      scopeType: "GLOBAL",
      scopeKeyRaw: "global",
      referenceDate,
    });
    expect(result.calculationVersion).toBeNull();
    expect(result.items).toHaveLength(0);
    expect(result.currentUser).toBeNull();
  });
});
