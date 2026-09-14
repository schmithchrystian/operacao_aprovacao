import { beforeEach, expect, it, vi } from "vitest";
import { ensureAuthenticatedUser } from "../helpers/authenticated-user";
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));
const { getRepositories } = await import("@/server/repositories");
const { getMyMission, listMyMissions, advanceMyMission } =
  await import("@/server/services/study-plan/missions");
const { __resetMockStudyMissionStore } =
  await import("@/server/repositories/mock/study-mission-repository");
let id: string;
beforeEach(async () => {
  __resetMockStudyMissionStore();
  ensureAuthenticatedUser("mission-owner");
  ensureAuthenticatedUser("mission-other");
  authMock.mockResolvedValue({ user: { id: "mission-owner", role: "aluno" } });
  const block = {
    type: "revisao" as const,
    label: "Revisão",
    title: "Revisar",
    minutes: 10,
    contentRef: null,
  };
  id = (
    await getRepositories().studyMissions.create({
      userId: "mission-owner",
      totalMinutes: 20,
      blocks: [block, block],
      now: new Date(),
    })
  ).id;
});
it("persists block advancement, rejects stale retries, and finishes idempotently without points", async () => {
  expect((await listMyMissions()).map((mission) => mission.id)).toEqual([id]);
  const points = await getRepositories().pointTransactions.sumByUserId("mission-owner");
  const results = await Promise.allSettled([advanceMyMission(id, 0), advanceMyMission(id, 0)]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  expect(await getMyMission(id)).toMatchObject({ currentBlockIndex: 1, status: "ACTIVE" });
  expect(await advanceMyMission(id, 1)).toMatchObject({ status: "FINISHED" });
  expect(await advanceMyMission(id, 1)).toMatchObject({ status: "FINISHED" });
  expect(await getRepositories().pointTransactions.sumByUserId("mission-owner")).toEqual(points);
});
it("does not expose or mutate another student's mission", async () => {
  authMock.mockResolvedValue({ user: { id: "mission-other", role: "aluno" } });
  expect(await listMyMissions()).toEqual([]);
  await expect(getMyMission(id)).rejects.toThrow("não encontrada");
  await expect(advanceMyMission(id, 0)).rejects.toThrow("não encontrada");
});
