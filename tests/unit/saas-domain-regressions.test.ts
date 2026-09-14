import { beforeEach, expect, it, vi } from "vitest";
const { sessionMock } = vi.hoisted(() => ({ sessionMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/authorization", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/authorization")>()),
  requireUser: sessionMock,
}));
const { getRepositories } = await import("@/server/repositories");
const { __resetMockCourseStore } = await import("@/server/repositories/mock/course-repository");
const { __resetMockModuleStore } = await import("@/server/repositories/mock/module-repository");
const { __resetMockLessonStore } = await import("@/server/repositories/mock/lesson-repository");
const { __resetMockProfileStore } = await import("@/server/repositories/mock/profile-repository");
const { __resetMockRankingScoreStore } =
  await import("@/server/repositories/mock/ranking-score-repository");
const { getCourseDetail } = await import("@/server/services/courses/course-detail");
const { enroll } = await import("@/server/services/courses/enroll");
const { getLessonView } = await import("@/server/services/study-tracking/lesson-view");
const { assertActiveEnrollment } = await import("@/server/services/study-tracking/enrollment");
const { validatedVideoUrl } = await import("@/server/services/courses/media-url");
const { getRanking } = await import("@/server/services/gamification/ranking/read");
const { getEffectiveBusinessConfig } = await import("@/server/services/admin/config-service");
const { setBusinessConfigOverride, __resetBusinessConfigOverrideStore } =
  await import("@/server/services/admin/config-store");
const now = new Date("2026-09-13T12:00:00.000Z");
beforeEach(() => {
  __resetMockCourseStore();
  __resetMockModuleStore();
  __resetMockLessonStore();
  __resetMockProfileStore();
  __resetMockRankingScoreStore();
  __resetBusinessConfigOverrideStore();
  sessionMock.mockResolvedValue({
    userId: "user-1",
    role: "aluno",
    name: "Test",
    email: "test@example.com",
  });
});
it.each(["DRAFT", "ARCHIVED"] as const)(
  "denies %s course by slug, enrollment and tracking gate",
  async (status) => {
    const repos = getRepositories();
    const course = (await repos.courses.findById("course-1"))!;
    await repos.courses.update({ id: course.id, status, now });
    await expect(getCourseDetail("user-1", course.slug)).rejects.toThrow("Curso não encontrado");
    await expect(enroll("user-1", course.id)).rejects.toThrow("Curso não encontrado");
    await expect(assertActiveEnrollment("user-1", course.id, "course-1-m1-l1")).rejects.toThrow(
      "Curso não encontrado",
    );
  },
);
it("denies soft-deleted course and unpublished module/lesson before tracking", async () => {
  const repos = getRepositories();
  const lesson = (await repos.lessons.findById("course-1-m1-l1"))!;
  await repos.modules.update({ id: lesson.moduleId, status: "DRAFT", now });
  await expect(assertActiveEnrollment("user-1", "course-1", lesson.id)).rejects.toThrow(
    "Aula não encontrada",
  );
  await repos.modules.update({ id: lesson.moduleId, status: "PUBLISHED", now });
  await repos.lessons.softDelete(lesson.id, now);
  await expect(assertActiveEnrollment("user-1", "course-1", lesson.id)).rejects.toThrow(
    "Aula não encontrada",
  );
  await repos.courses.softDelete("course-1", now);
  await expect(enroll("user-1", "course-1")).rejects.toThrow("Curso não encontrado");
});
it("returns saved HTTPS video and explicit missing-media state", async () => {
  const repos = getRepositories();
  const lesson = (await repos.lessons.findById("course-1-m1-l1"))!;
  const courseModule = (await repos.modules.findById(lesson.moduleId))!;
  const course = (await repos.courses.findById(courseModule.courseId))!;
  await repos.enrollments.create({ userId: "user-1", courseId: course.id });
  await repos.lessons.update({
    id: lesson.id,
    videoUrl: "https://media.example.com/lesson.mp4",
    now,
  });
  expect((await getLessonView("user-1", course.slug, courseModule.slug, lesson.id)).videoUrl).toBe(
    "https://media.example.com/lesson.mp4",
  );
  await repos.lessons.update({ id: lesson.id, videoUrl: null, now });
  expect((await getLessonView("user-1", course.slug, courseModule.slug, lesson.id)).videoUrl).toBe(
    "",
  );
});
it.each([
  "javascript:alert(1)",
  "http://media.example.com/a.mp4",
  "https://user:secret@media.example.com/a.mp4",
  "https://cdn.opapp.mock/a.mp4",
])("rejects unsafe media %s", (url) => {
  expect(() => validatedVideoUrl(url)).toThrow();
});
it("masks private metrics in every public ranking projection but preserves owner's values", async () => {
  const repos = getRepositories();
  if (!(await repos.profiles.findByUserId("user-1")))
    await repos.profiles.create({ userId: "user-1", now });
  await repos.profiles.updatePrivacy({
    userId: "user-1",
    isProfilePublic: true,
    showInRanking: true,
    showStudyHours: false,
    showPerformance: false,
    now,
  });
  const metric = (raw: number) => ({ raw, normalized: 1, weight: 0.2, contribution: 0.2 });
  await repos.rankingScores.upsert({
    userId: "user-1",
    periodType: "ALL_TIME",
    periodKey: "all",
    scopeType: "GLOBAL",
    scopeKey: "global",
    calculationVersion: 1,
    rank: 1,
    score: 1,
    now,
    breakdown: {
      metrics: {
        mockExamPerformance: metric(87),
        lessonsCompleted: metric(12),
        consistency: metric(1),
        validHours: metric(42),
        goalsCompleted: metric(1),
      },
      display: { points: 100, xp: 100, streakDays: 7 },
    },
  });
  sessionMock.mockResolvedValue({ userId: "user-2", role: "aluno" });
  const input = {
    periodType: "ALL_TIME",
    scopeType: "GLOBAL",
    scopeKeyRaw: "global",
    referenceDate: now,
  } as const;
  const visitor = await getRanking(input);
  for (const row of [...visitor.items, ...visitor.top3])
    expect(row).toMatchObject({
      validHours: null,
      lessonsCompleted: null,
      accuracyPercent: null,
      streakDays: null,
    });
  sessionMock.mockResolvedValue({ userId: "user-1", role: "aluno" });
  expect((await getRanking(input)).currentUser).toMatchObject({
    validHours: 42,
    lessonsCompleted: 12,
    accuracyPercent: 87,
    streakDays: 7,
  });
});
it("publishes a versioned effective rule without mutating prior snapshots", async () => {
  const before = await getEffectiveBusinessConfig();
  await setBusinessConfigOverride({
    gamificationRewards: { LESSON_COMPLETED: { points: 12345, xp: 321 } },
  });
  const after = await getEffectiveBusinessConfig();
  expect(after.gamificationRewards.LESSON_COMPLETED).toEqual({ points: 12345, xp: 321 });
  expect(after.version).toBeGreaterThan(before.version);
  expect(before.gamificationRewards.LESSON_COMPLETED.points).not.toBe(12345);
  await expect(setBusinessConfigOverride({ rankingWeights: { validTime: 1 } })).rejects.toThrow(
    "somar 1",
  );
  expect((await getEffectiveBusinessConfig()).version).toBe(after.version);
});
it("uses persisted achievement metadata and declarative criteria; archived entries stop unlocking", async () => {
  const repos = getRepositories();
  const { getAchievementDefinitions, computeUserGamificationStats } =
    await import("@/server/services/gamification/read");
  const achievement = await repos.achievements.create({
    key: "saas-regression",
    name: "Meta real",
    criteria: { metric: "lessonsCompleted", operator: "gte", threshold: 2 },
    now,
  });
  const definitions = await getAchievementDefinitions();
  const definition = definitions.find((row) => row.key === achievement.key)!;
  const stats = await computeUserGamificationStats("user-1");
  expect(definition.name).toBe("Meta real");
  expect(definition.isUnlocked({ ...stats, lessonsCompleted: 1 })).toBe(false);
  expect(definition.isUnlocked({ ...stats, lessonsCompleted: 2 })).toBe(true);
  await repos.achievements.softDelete(achievement.id, now);
  expect((await getAchievementDefinitions()).some((row) => row.key === achievement.key)).toBe(
    false,
  );
});
it("derives exam achievement scores from finished attempts", async () => {
  const repos = getRepositories();
  const spy = vi.spyOn(repos.mockExamAttempts, "listByUserId").mockResolvedValue([
    { status: "FINISHED", scorePercent: 91 },
    { status: "FINISHED", scorePercent: 95 },
    { status: "FINISHED", scorePercent: 90 },
    { status: "IN_PROGRESS", scorePercent: 100 },
  ] as Awaited<ReturnType<typeof repos.mockExamAttempts.listByUserId>>);
  const { computeUserGamificationStats } = await import("@/server/services/gamification/read");
  expect(await computeUserGamificationStats("user-1")).toMatchObject({
    bestMockExamAccuracyPercent: 95,
    mockExamsAboveAccuracyThreshold: 2,
  });
  spy.mockRestore();
});
it("does not expose a retained public profile when its account is no longer available", async () => {
  const repos = getRepositories();
  if (!(await repos.profiles.findByUserId("user-1")))
    await repos.profiles.create({ userId: "user-1", now });
  await repos.profiles.updatePrivacy({
    userId: "user-1",
    isProfilePublic: true,
    showInRanking: true,
    now,
  });
  await repos.rankingScores.upsert({
    userId: "user-1",
    periodType: "ALL_TIME",
    periodKey: "all",
    scopeType: "GLOBAL",
    scopeKey: "global",
    calculationVersion: 1,
    rank: 1,
    score: 1,
    now,
  });
  sessionMock.mockResolvedValue({ userId: "user-2", role: "aluno" });
  const find = repos.users.findById.bind(repos.users);
  const spy = vi
    .spyOn(repos.users, "findById")
    .mockImplementation(async (id) => (id === "user-1" ? null : find(id)));
  const result = await getRanking({
    periodType: "ALL_TIME",
    scopeType: "GLOBAL",
    scopeKeyRaw: "global",
    referenceDate: now,
  });
  expect(result.items).toEqual([]);
  expect(result.top3).toEqual([]);
  expect(result.total).toBe(0);
  spy.mockRestore();
});
