import { ensureAuthenticatedUser } from "../helpers/authenticated-user";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

// `ranking/read.ts` -> `@/server/authorization` -> `@/server/auth` (Auth.js). Mockar ANTES de
// importar o módulo sob teste — mesmo padrão de `tests/unit/gamification-engine.test.ts`.
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));


const { getRanking, anonymizedRankingName } = await import("@/server/services/gamification/ranking/read");
const { recalculateRankingForScope } = await import("@/server/services/gamification/ranking/recalculate");
const { mockRankingParticipants } = await import("@/mocks");
const { getRepositories } = await import("@/server/repositories");
const { __resetMockRankingScoreStore } = await import("@/server/repositories/mock/ranking-score-repository");
const { __resetMockProfileStore } = await import("@/server/repositories/mock/profile-repository");
const { RANKING_PAGE_SIZE } = await import("@/config/business");

function fakeSession(id: string): NextAuthSession {
  ensureAuthenticatedUser(id);
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
    __resetMockProfileStore();
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

    const otherUser = mockRankingParticipants.find(
      (p) => p.isProfilePublic && p.showInRanking && p.userId !== optedOut!.userId,
    )!;
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

    // Visível = perfil público E dentro do ranking (achado M2: `isProfilePublic` cascateia).
    const visibleCount = mockRankingParticipants.filter((p) => p.isProfilePublic && p.showInRanking).length;
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

  /**
   * Achado M2 (revisão de segurança Fase 16): perfil FECHADO (`isProfilePublic=false`) cascateia
   * sobre o ranking — some das listagens públicas mesmo com `showInRanking=true` — mas o próprio
   * dono continua vendo sua posição real via `currentUser`.
   */
  it("M2: perfil FECHADO (isProfilePublic=false, showInRanking=true) some das listagens públicas, mas o próprio vê sua posição", async () => {
    const closedButRanking = mockRankingParticipants.find((p) => !p.isProfilePublic && p.showInRanking);
    expect(closedButRanking).toBeDefined();

    // (a) Um terceiro visível NÃO vê a linha do perfil fechado.
    const otherUser = mockRankingParticipants.find(
      (p) => p.isProfilePublic && p.showInRanking && p.userId !== closedButRanking!.userId,
    )!;
    authMock.mockResolvedValue(fakeSession(otherUser.userId));
    const asOther = await getRanking({ periodType: "ALL_TIME", scopeType: "GLOBAL", scopeKeyRaw: "global", referenceDate });
    expect(asOther.items.some((entry) => entry.userId === closedButRanking!.userId)).toBe(false);
    expect(asOther.top3.some((entry) => entry.userId === closedButRanking!.userId)).toBe(false);

    // (b) O próprio dono do perfil fechado ainda vê sua posição real.
    authMock.mockResolvedValue(fakeSession(closedButRanking!.userId));
    const asSelf = await getRanking({ periodType: "ALL_TIME", scopeType: "GLOBAL", scopeKeyRaw: "global", referenceDate });
    expect(asSelf.currentUser).not.toBeNull();
    expect(asSelf.currentUser!.userId).toBe(closedButRanking!.userId);
    expect(asSelf.currentUser!.position).toBeGreaterThan(0);
    expect(asSelf.items.some((entry) => entry.userId === closedButRanking!.userId)).toBe(false);
  });

  it("devolve a posição do usuário atual mesmo quando ela está fora da página solicitada", async () => {
    const repos = getRepositories();
    const rows = await repos.rankingScores.listByScopeAndVersion("ALL_TIME", "all", "GLOBAL", "global", 1);
    const participantsById = new Map(mockRankingParticipants.map((p) => [p.userId, p]));

    const visibleSorted = [...rows]
      .filter((row) => {
        const p = participantsById.get(row.userId);
        // Mesmo critério de visibilidade da implementação (achado M2): público E no ranking.
        return p?.isProfilePublic !== false && p?.showInRanking !== false;
      })
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

  /**
   * Fase 16 — fecha a pendência da Fase 9 (TODO histórico em `mockRankingParticipants`):
   * privacidade agora consultada via `ProfileRepository` para usuários com `Profile` real,
   * com fallback para o dataset fictício. `user-3` (seed `src/mocks/data/profiles.ts`) tem
   * `Profile.showInRanking = true` mas NÃO existe em `mockRankingParticipants` — antes desta
   * fase, uma linha assim seria excluída por fail-closed (identidade não resolvida); agora ela
   * aparece, com nome anonimizado (`showRealName: false`) e cidade/estado reais
   * (`showCityState: true`) vindos do `Profile`, provando que a fonte realmente mudou.
   */
  it("Fase 16: usuário com Profile real (sem entrada em mockRankingParticipants) aparece na listagem, com privacidade do Profile", async () => {
    const repos = getRepositories();
    await repos.rankingScores.upsert({
      userId: "user-3",
      periodType: "ALL_TIME",
      periodKey: "all",
      scopeType: "GLOBAL",
      scopeKey: "global",
      calculationVersion: 1,
      score: 0.9,
      rank: 1,
      breakdown: null,
      now: referenceDate,
    });

    authMock.mockResolvedValue(fakeSession("user-1"));
    const result = await getRanking({ periodType: "ALL_TIME", scopeType: "GLOBAL", scopeKeyRaw: "global", referenceDate });

    const entry = result.items.find((item) => item.userId === "user-3");
    expect(entry).toBeDefined();
    expect(entry!.displayName).toBe(anonymizedRankingName("user-3")); // showRealName: false no Profile
    expect(entry!.city).toBe("Rio de Janeiro"); // showCityState: true no Profile
    expect(entry!.state).toBe("RJ");
  });

  it("Fase 16: comportamento de user-1 (participante real pré-existente) não muda ao trocar a fonte de privacidade", async () => {
    // `currentUser` resolve a linha do PRÓPRIO usuário da sessão independente de página/visibilidade
    // (mesma garantia já testada acima) — evita depender de em qual página user-1 cai entre os 50
    // participantes de demonstração.
    authMock.mockResolvedValue(fakeSession("user-1"));
    const result = await getRanking({ periodType: "ALL_TIME", scopeType: "GLOBAL", scopeKeyRaw: "global", referenceDate });

    expect(result.currentUser).not.toBeNull();
    expect(result.currentUser!.userId).toBe("user-1");
    expect(result.currentUser!.displayName).toBe("Ana Recruta"); // nome real (Profile.showRealName: true)
    expect(result.currentUser!.city).toBe("São Paulo");
    expect(result.currentUser!.state).toBe("SP");
  });
});
