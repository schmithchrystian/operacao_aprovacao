/**
 * Caracterizações da auditoria, separadas da suíte de regressão.
 * PASSAR significa REPRODUZIR o defeito no commit auditado, não aprovar segurança.
 * Após corrigir, inverter as expectativas e mover o cenário para tests/.
 * Somente mocks locais; não conectar a banco ou ambiente de produção.
 */
import { beforeEach, expect, it, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));

const { requireRole } = await import("@/server/authorization");
const { getRepositories } = await import("@/server/repositories");
const { __resetMockUserStore } = await import("@/server/repositories/mock/user-repository");
const { __resetMockCourseStore } = await import("@/server/repositories/mock/course-repository");
const { __resetMockProfileStore } = await import("@/server/repositories/mock/profile-repository");
const { __resetMockRankingScoreStore } = await import("@/server/repositories/mock/ranking-score-repository");
const { getCourseDetail } = await import("@/server/services/courses/course-detail");
const { getLessonView } = await import("@/server/services/study-tracking/lesson-view");
const { getRanking } = await import("@/server/services/gamification/ranking/read");
const { setBusinessConfigOverride, __resetBusinessConfigOverrideStore } = await import("@/server/services/admin/config-store");
const { computeReward } = await import("@/server/services/gamification/engine");
const { createAttempt, submitAndFinalize } = await import("@/server/services/simulations");
const { mockExamConfigInputSchema } = await import("@/contracts/simulations");
const { MOCK_EXAM_IDS } = await import("@/mocks");
const now = new Date("2026-09-13T12:00:00.000Z");

function session(id: string, role = "aluno") {
  return { user: { id, role, name: "Auditoria", email: "audit@example.com" }, expires: "2027-01-01T00:00:00Z" };
}

beforeEach(() => {
  vi.restoreAllMocks();
  __resetMockUserStore();
  __resetMockCourseStore();
  __resetMockProfileStore();
  __resetMockRankingScoreStore();
  __resetBusinessConfigOverrideStore();
  authMock.mockResolvedValue(session("user-1"));
});

it("S02: conta desativada e rebaixada ainda passa requireRole com JWT anterior", async () => {
  const repos = getRepositories();
  authMock.mockResolvedValue(session("user-4", "admin"));
  await repos.users.setActive("user-4", false);
  await repos.users.updateRole("user-4", "aluno");
  expect(await repos.users.findById("user-4")).toMatchObject({ isActive: false, role: "aluno" });
  await expect(requireRole("admin")).resolves.toMatchObject({ role: "admin" });
});

it("S06: curso em rascunho é acessível pelo slug", async () => {
  const repos = getRepositories();
  const course = await repos.courses.findById("course-1");
  expect(course).not.toBeNull();
  await repos.courses.update({ id: course!.id, status: "DRAFT", now });
  const result = await getCourseDetail("user-1", course!.slug);
  expect(result.course.id).toBe(course!.id);
});

it("F01: URL de vídeo cadastrada é ignorada no DTO da aula", async () => {
  const repos = getRepositories();
  const course = await repos.courses.findById("course-1");
  const lesson = await repos.lessons.findById("course-1-m1-l1");
  const lessonModule = await repos.modules.findById(lesson!.moduleId);
  await repos.enrollments.create({ userId: "user-1", courseId: "course-1" });
  await repos.lessons.update({ id: lesson!.id, videoUrl: "https://video.example.com/aula.mp4", now });
  const result = await getLessonView("user-1", course!.slug, lessonModule!.slug, lesson!.id);
  expect(result.videoUrl).toBe(`https://cdn.opapp.mock/videos/${lesson!.id}.mp4`);
});

it("F03: alteração administrativa de recompensa não afeta o motor", () => {
  const before = computeReward("LESSON_COMPLETED");
  setBusinessConfigOverride({ gamificationRewards: { LESSON_COMPLETED: { points: 12345, xp: 12345 } } });
  expect(computeReward("LESSON_COMPLETED")).toEqual(before);
  expect(computeReward("LESSON_COMPLETED").points).not.toBe(12345);
});

it("S05: ranking revela horas e desempenho com flags de privacidade desligadas", async () => {
  const repos = getRepositories();
  if (!(await repos.profiles.findByUserId("user-1"))) await repos.profiles.create({ userId: "user-1", now });
  await repos.profiles.updatePrivacy({ userId: "user-1", isProfilePublic: true, showInRanking: true, showStudyHours: false, showPerformance: false, now });
  const metric = (raw: number) => ({ raw, normalized: 1, weight: 0.2, contribution: 0.2 });
  await repos.rankingScores.upsert({
    userId: "user-1", periodType: "ALL_TIME", periodKey: "all", scopeType: "GLOBAL", scopeKey: "global", calculationVersion: 1, rank: 1, score: 1, now,
    breakdown: { metrics: { mockExamPerformance: metric(87), lessonsCompleted: metric(12), consistency: metric(1), validHours: metric(42), goalsCompleted: metric(1) }, display: { points: 100, xp: 100, streakDays: 1 } },
  });
  authMock.mockResolvedValue(session("user-2"));
  const result = await getRanking({ periodType: "ALL_TIME", scopeType: "GLOBAL", scopeKeyRaw: "global", referenceDate: now });
  expect(result.items.find(row => row.userId === "user-1")).toMatchObject({ validHours: 42, accuracyPercent: 87, lessonsCompleted: 12 });
});

it("S07: falha ao salvar respostas deixa simulado finalizado e impede retry", async () => {
  const repos = getRepositories();
  const attempt = await createAttempt("user-1", mockExamConfigInputSchema.parse({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));
  vi.spyOn(repos.questionAttempts, "upsertForMockExamAttempt").mockRejectedValueOnce(new Error("Falha de escrita injetada pela auditoria"));
  await expect(submitAndFinalize("user-1", { attemptId: attempt.id, answers: [] })).rejects.toThrow("Falha de escrita");
  expect(await repos.mockExamAttempts.findById(attempt.id)).toMatchObject({ status: "FINISHED" });
  await expect(submitAndFinalize("user-1", { attemptId: attempt.id, answers: [] })).rejects.toThrow("já foi finalizada");
});
