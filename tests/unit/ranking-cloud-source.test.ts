import { expect, it, vi } from "vitest";
const { repos } = vi.hoisted(() => ({
  repos: {
    users: { list: vi.fn(), findById: vi.fn() },
    profiles: { findByUserIds: vi.fn() },
    lessonProgress: { listByUserId: vi.fn() },
    studySessions: { listRecentSessionsByUserId: vi.fn() },
    dailyGoals: { listByUserId: vi.fn() },
    weeklyGoals: { listByUserId: vi.fn() },
    userStreaks: { findByUserId: vi.fn() },
    gamificationEvents: { listByUserId: vi.fn() },
    pointTransactions: { sumByUserId: vi.fn() },
    mockExamAttempts: { listByUserId: vi.fn() },
    enrollments: { listByUserId: vi.fn() },
    courses: { findById: vi.fn() },
  },
}));
vi.mock("@/config/env", () => ({ env: { DATA_SOURCE: "prisma" } }));
vi.mock("@/server/services/study-tracking/activity-samples", () => ({ listUserActivitySamples: (userId: string) => repos.studySessions.listRecentSessionsByUserId(userId) }));
vi.mock("@/server/repositories", () => ({ getRepositories: () => repos }));
const { loadRankingParticipants } =
  await import("@/server/services/gamification/ranking/participants");
const { selectCandidatesForScope } = await import("@/server/services/gamification/ranking/scope");
it("loads real active students and all active published enrollments, without demo participants", async () => {
  repos.users.list.mockResolvedValue([
    { id: "real", role: "aluno", isActive: true, createdAt: "2026-01-01", name: "Real" },
    { id: "disabled", role: "aluno", isActive: false },
    { id: "deleted", role: "aluno", isActive: true, deletedAt: "2026-01-01" },
    { id: "admin", role: "admin", isActive: true },
  ]);
  repos.profiles.findByUserIds.mockResolvedValue([
    { userId: "real", showInRanking: true, isProfilePublic: true, city: "Santos" },
  ]);
  repos.enrollments.listByUserId.mockResolvedValue([
    { courseId: "a", status: "active" },
    { courseId: "b", status: "completed" },
    { courseId: "draft", status: "active" },
    { courseId: "cancelled", status: "cancelled" },
  ]);
  repos.courses.findById.mockImplementation(async (id: string) => ({
    id,
    contestId: "contest",
    status: id === "draft" ? "DRAFT" : "PUBLISHED",
    deletedAt: null,
  }));
  const participants = await loadRankingParticipants();
  expect(participants.map((row) => row.userId)).toEqual(["real", "real"]);
  expect(selectCandidatesForScope(participants, "COURSE", "b")).toHaveLength(1);
  expect(participants.some((row) => row.courseId === "draft" || row.courseId === "cancelled")).toBe(
    false,
  );
  expect(repos.profiles.findByUserIds).toHaveBeenCalledWith(["real"]);
});

it("uses actual period metrics, never demonstration accuracy or goals in Prisma mode", async () => {
  repos.users.findById.mockResolvedValue({ id: "real" });
  repos.lessonProgress.listByUserId.mockResolvedValue([]);
  repos.studySessions.listRecentSessionsByUserId.mockResolvedValue([
    { status: "FINISHED", lastHeartbeatAt: "2026-09-13T12:00:00Z", validSeconds: 3600 },
    { status: "FINISHED", lastHeartbeatAt: "2026-09-12T12:00:00Z", validSeconds: 7200 },
    { status: "DISCARDED", lastHeartbeatAt: "2026-09-13T12:00:00Z", validSeconds: 7200 },
  ]);
  repos.dailyGoals.listByUserId.mockResolvedValue([
    { achieved: true, achievedAt: "2026-09-13T12:00:00Z" },
  ]);
  repos.weeklyGoals.listByUserId.mockResolvedValue([
    { achieved: true, achievedAt: "2026-09-12T12:00:00Z" },
  ]);
  repos.userStreaks.findByUserId.mockResolvedValue({ currentStreak: 3 });
  repos.gamificationEvents.listByUserId.mockResolvedValue([]);
  repos.pointTransactions.sumByUserId.mockResolvedValue({ points: 20, xp: 20 });
  repos.mockExamAttempts.listByUserId.mockResolvedValue([]);
  const { gatherRawMetrics } = await import("@/server/services/gamification/ranking/metrics");
  const { buildPeriodWindow } = await import("@/server/services/gamification/ranking/scope");
  const participant = {
    userId: "real",
    mockExamAccuracyPercent: 99,
    mockGoalsCompletedCount: 123,
  } as Parameters<typeof gatherRawMetrics>[0];
  expect(
    await gatherRawMetrics(
      participant,
      buildPeriodWindow("DAILY", new Date("2026-09-13T15:00:00Z")),
    ),
  ).toMatchObject({ validHours: 1, goalsCompleted: 1, mockExamPerformance: 0, streakDays: 3 });
});
