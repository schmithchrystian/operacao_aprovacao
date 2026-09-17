import { beforeEach, expect, it, vi } from "vitest";
import { ensureAuthenticatedUser } from "../helpers/authenticated-user";
const { authMock, load } = vi.hoisted(() => ({ authMock: vi.fn(), load: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));
vi.mock("@/server/services/gamification/ranking/participants", () => ({
  loadRankingParticipants: load,
}));
const { mockRankingParticipants } = await import("@/mocks");
const { getRepositories } = await import("@/server/repositories");
const { __resetMockRankingScoreStore } =
  await import("@/server/repositories/mock/ranking-score-repository");
const { recalculateRankingForScope } =
  await import("@/server/services/gamification/ranking/recalculate");
const { getRanking } = await import("@/server/services/gamification/ranking/read");
const input = {
  periodType: "ALL_TIME",
  scopeType: "GLOBAL",
  scopeKeyRaw: "global",
  referenceDate: new Date("2026-09-13T12:00:00Z"),
} as const;
beforeEach(() => {
  vi.restoreAllMocks();
  __resetMockRankingScoreStore();
  ensureAuthenticatedUser("ranking-snapshot-reader");
  authMock.mockResolvedValue({ user: { id: "ranking-snapshot-reader", role: "aluno" } });
  load.mockResolvedValue(mockRankingParticipants.slice(0, 2));
});
it("prunes removed participants and keeps an empty latest snapshot without falling back to history", async () => {
  const repo = getRepositories().rankingScores;
  await recalculateRankingForScope({ ...input, calculationVersion: 1 });
  load.mockResolvedValue(mockRankingParticipants.slice(0, 1));
  await recalculateRankingForScope({ ...input, calculationVersion: 2 });
  expect(await repo.listByScopeAndVersion("ALL_TIME", "all", "GLOBAL", "global", 1)).toHaveLength(
    2,
  );
  expect(await repo.listByScopeAndVersion("ALL_TIME", "all", "GLOBAL", "global", 2)).toHaveLength(
    1,
  );
  load.mockResolvedValue([]);
  await recalculateRankingForScope({ ...input, calculationVersion: 2 });
  expect(await repo.findLatestVersion("ALL_TIME", "all", "GLOBAL", "global")).toBe(2);
  expect(await getRanking(input)).toMatchObject({
    calculationVersion: 2,
    total: 0,
    items: [],
    top3: [],
    currentUser: null,
  });
  await expect(recalculateRankingForScope({ ...input, calculationVersion: 1 })).rejects.toThrow(
    "histórica",
  );
});
it("rolls back partial rows and snapshot metadata when recalculation fails", async () => {
  const repo = getRepositories().rankingScores;
  await recalculateRankingForScope({ ...input, calculationVersion: 1 });
  const finalize = repo.finalizeScopeVersion.bind(repo);
  const spy = vi.spyOn(repo, "finalizeScopeVersion").mockImplementationOnce(async (snapshot) => {
    await finalize(snapshot);
    throw new Error("injected failure after snapshot");
  });
  await expect(recalculateRankingForScope({ ...input, calculationVersion: 2 })).rejects.toThrow(
    "injected failure",
  );
  expect(await repo.listByScopeAndVersion("ALL_TIME", "all", "GLOBAL", "global", 2)).toEqual([]);
  expect(await repo.findLatestVersion("ALL_TIME", "all", "GLOBAL", "global")).toBe(1);
  spy.mockRestore();
});
