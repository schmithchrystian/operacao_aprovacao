import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));
const prefix = `notes-nav-${randomUUID()}`;
let prisma: typeof import("@/server/db/prisma").prisma;
let userId: string,
  otherId: string,
  courseId: string,
  lessonId: string,
  subjectId: string,
  contestId: string;
beforeAll(async () => {
  ({ prisma } = await import("@/server/db/prisma"));
  userId = (
    await prisma.user.create({
      data: { name: prefix, email: `${prefix}@example.invalid`, passwordHash: "unused" },
    })
  ).id;
  otherId = (
    await prisma.user.create({
      data: { name: prefix, email: `${prefix}-other@example.invalid`, passwordHash: "unused" },
    })
  ).id;
  subjectId = (await prisma.subject.create({ data: { name: prefix, slug: prefix } })).id;
  contestId = (await prisma.contest.create({ data: { name: prefix, slug: prefix } })).id;
  const course = await prisma.course.create({
    data: {
      title: prefix,
      slug: prefix,
      description: "Synthetic",
      status: "PUBLISHED",
      contestId,
      modules: {
        create: {
          title: prefix,
          order: 1,
          subjectId,
          slug: prefix,
          status: "PUBLISHED",
          lessons: {
            create: { title: prefix, order: 1, durationSeconds: 120, status: "PUBLISHED" },
          },
        },
      },
    },
    include: { modules: { include: { lessons: true } } },
  });
  courseId = course.id;
  lessonId = course.modules[0]!.lessons[0]!.id;
  await prisma.enrollment.createMany({
    data: [
      { userId, courseId },
      { userId: otherId, courseId },
    ],
  });
  authMock.mockResolvedValue({ user: { id: userId, role: "aluno" } });
});
afterAll(async () => {
  if (!prisma) return;
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherId].filter(Boolean) } } });
  if (courseId) await prisma.course.delete({ where: { id: courseId } });
  if (subjectId) await prisma.subject.delete({ where: { id: subjectId } });
  if (contestId) await prisma.contest.delete({ where: { id: contestId } });
});
it("persists and reconnects notes, rejects stale CAS writes and isolates users in PostgreSQL", async () => {
  const { getLessonNote, saveLessonNote } = await import("@/server/services/courses/lesson-notes");
  await saveLessonNote({ lessonId, content: "Persistido", expectedVersion: 0 });
  await prisma.$disconnect();
  expect(await getLessonNote(lessonId)).toMatchObject({ content: "Persistido", version: 1 });
  const results = await Promise.allSettled([
    saveLessonNote({ lessonId, content: "A", expectedVersion: 1 }),
    saveLessonNote({ lessonId, content: "B", expectedVersion: 1 }),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  expect((await getLessonNote(lessonId)).version).toBe(2);
  authMock.mockResolvedValue({ user: { id: otherId, role: "aluno" } });
  expect(await getLessonNote(lessonId)).toMatchObject({ content: "", version: 0 });
});
it("marks notifications read only for the owner and persists across reconnect", async () => {
  const { PrismaNotificationRepository } =
    await import("@/server/repositories/prisma/notification-repository");
  const repo = new PrismaNotificationRepository();
  const [notification] = await repo.createMany([
    { userId, title: prefix, message: "Synthetic", type: "SYSTEM", now: new Date() },
  ]);
  expect(await repo.markRead(otherId, notification!.id)).toBe(false);
  expect(await repo.markRead(userId, notification!.id)).toBe(true);
  await prisma.$disconnect();
  expect((await repo.listByUserId(userId)).find((row) => row.id === notification!.id)?.isRead).toBe(
    true,
  );
});
it("persists mission advancement with compare-and-swap and idempotent finish", async () => {
  authMock.mockResolvedValue({ user: { id: userId, role: "aluno" } });
  const { getRepositories } = await import("@/server/repositories");
  const { advanceMyMission, getMyMission } = await import("@/server/services/study-plan/missions");
  const block = {
    type: "revisao" as const,
    label: "Revisão",
    title: "Revisar",
    minutes: 10,
    contentRef: null,
  };
  const mission = await getRepositories().studyMissions.create({
    userId,
    blocks: [block, block],
    totalMinutes: 20,
    now: new Date(),
  });
  const results = await Promise.allSettled([
    advanceMyMission(mission.id, 0),
    advanceMyMission(mission.id, 0),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  await prisma.$disconnect();
  expect(await getMyMission(mission.id)).toMatchObject({ status: "ACTIVE", currentBlockIndex: 1 });
  expect(await advanceMyMission(mission.id, 1)).toMatchObject({ status: "FINISHED" });
  expect(await advanceMyMission(mission.id, 1)).toMatchObject({ status: "FINISHED" });
  await prisma.auditLog.deleteMany({ where: { entityId: mission.id } });
});
it("preserves an empty latest ranking snapshot and atomically rolls back failed snapshots", async () => {
  const { getRepositories } = await import("@/server/repositories");
  const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
  const repo = getRepositories().rankingScores;
  const key = {
    periodType: "ALL_TIME",
    periodKey: "all",
    scopeType: "COURSE",
    scopeKey: `course:${courseId}`,
  } as const;
  await repo.upsert({ ...key, userId, calculationVersion: 1, score: 1, rank: 1, now: new Date() });
  await repo.finalizeScopeVersion({ ...key, calculationVersion: 2, userIds: [], now: new Date() });
  expect(
    await repo.findLatestVersion(key.periodType, key.periodKey, key.scopeType, key.scopeKey),
  ).toBe(2);
  expect(
    await repo.listByScopeAndVersion(key.periodType, key.periodKey, key.scopeType, key.scopeKey, 1),
  ).toHaveLength(1);
  await expect(
    inRepositoryTransaction(async () => {
      await repo.upsert({
        ...key,
        userId,
        calculationVersion: 3,
        score: 2,
        rank: 1,
        now: new Date(),
      });
      await repo.finalizeScopeVersion({
        ...key,
        calculationVersion: 3,
        userIds: [userId],
        now: new Date(),
      });
      throw new Error("rollback snapshot");
    }),
  ).rejects.toThrow("rollback snapshot");
  expect(
    await repo.findLatestVersion(key.periodType, key.periodKey, key.scopeType, key.scopeKey),
  ).toBe(2);
  expect(
    await repo.listByScopeAndVersion(key.periodType, key.periodKey, key.scopeType, key.scopeKey, 3),
  ).toEqual([]);
  await prisma.rankingSnapshot.deleteMany({ where: key });
});

it("denies expired and cancelled enrollment even if its stored status remains ACTIVE", async () => {
  const { assertActiveEnrollment } = await import("@/server/services/study-tracking/enrollment");
  for (const data of [
    { expiresAt: new Date(0), cancelledAt: null },
    { expiresAt: null, cancelledAt: new Date() },
  ]) {
    await prisma.enrollment.update({ where: { userId_courseId: { userId, courseId } }, data });
    await expect(assertActiveEnrollment(userId, courseId, lessonId)).rejects.toThrow("matriculado");
  }
  await prisma.enrollment.update({
    where: { userId_courseId: { userId, courseId } },
    data: { expiresAt: null, cancelledAt: null },
  });
  await expect(assertActiveEnrollment(userId, courseId, lessonId)).resolves.toBeUndefined();
});
it("serves a real new student's dashboard without demo records and respects ownership", async () => {
  const { getStudentDashboard } = await import("@/server/services/dashboard-service");
  const { dashboardDTOSchema } = await import("@/contracts/dashboard");
  authMock.mockResolvedValue({ user: { id: userId, role: "aluno" } });
  const dashboard = await getStudentDashboard(userId);
  expect(dashboardDTOSchema.safeParse(dashboard).success).toBe(true);
  expect(dashboard.identity.studentName).toBe(prefix);
  expect(dashboard.identity.selectedContestId).toBeNull();
  expect(dashboard.ranking).toBeNull();
  expect(dashboard.study.weeklyStudyMinutes).toBe(0);
  expect(dashboard.nextLesson?.lessonId).toBe(lessonId);
  await expect(getStudentDashboard(otherId)).rejects.toThrow();
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, targetContestId: contestId },
    update: { targetContestId: contestId },
  });
  await prisma.studySession.create({
    data: {
      userId,
      lessonId,
      source: "LESSON",
      validSeconds: 120,
      activities: { create: { type: "VIDEO_HEARTBEAT", payload: { validSeconds: 120 } } },
    },
  });
  const updated = await getStudentDashboard(userId);
  expect(updated.identity.selectedContestId).toBe(contestId);
  expect(updated.study.weeklyStudyMinutes).toBe(2);
  expect(updated.studyHoursSeries.reduce((sum, day) => sum + day.minutes, 0)).toBe(2);
});
