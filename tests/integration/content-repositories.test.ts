// @vitest-environment node
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PrismaSubjectRepository } from "@/server/repositories/prisma/subject-repository";
import { PrismaTopicRepository } from "@/server/repositories/prisma/topic-repository";
import { PrismaTeacherRepository } from "@/server/repositories/prisma/teacher-repository";
import { PrismaContestRepository } from "@/server/repositories/prisma/contest-repository";
import { PrismaCourseRepository } from "@/server/repositories/prisma/course-repository";
import { PrismaModuleRepository } from "@/server/repositories/prisma/module-repository";
import { PrismaLessonRepository } from "@/server/repositories/prisma/lesson-repository";
import { PrismaEnrollmentRepository } from "@/server/repositories/prisma/enrollment-repository";
import { PrismaLessonProgressRepository } from "@/server/repositories/prisma/lesson-progress-repository";
import { PrismaProfileRepository } from "@/server/repositories/prisma/profile-repository";
import { PrismaNotificationRepository } from "@/server/repositories/prisma/notification-repository";
import { PrismaAchievementRepository } from "@/server/repositories/prisma/achievement-repository";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
describe.skipIf(!enabled)("PostgreSQL content repositories", () => {
  const prefix = "integration-" + randomUUID();
  const now = new Date("2026-09-14T00:00:00Z");
  const subjects = new PrismaSubjectRepository(),
    topics = new PrismaTopicRepository(),
    teachers = new PrismaTeacherRepository(),
    contests = new PrismaContestRepository(),
    courses = new PrismaCourseRepository(),
    modules = new PrismaModuleRepository(),
    lessons = new PrismaLessonRepository(),
    enrollments = new PrismaEnrollmentRepository(),
    progress = new PrismaLessonProgressRepository(),
    profiles = new PrismaProfileRepository(),
    notifications = new PrismaNotificationRepository(),
    achievements = new PrismaAchievementRepository();
  let userId: string,
    otherId: string,
    subjectId: string,
    topicId: string,
    teacherId: string,
    contestId: string,
    courseId: string,
    moduleId: string,
    lessonId: string;
  beforeAll(async () => {
    if (process.env.DATA_SOURCE !== "prisma" || !process.env.DATABASE_URL)
      throw new Error("Integration requires DATA_SOURCE=prisma and isolated DATABASE_URL");
    const { prisma } = await import("@/server/db/prisma");
    userId = (
      await prisma.user.create({
        data: {
          name: prefix,
          email: prefix + "@example.invalid",
          passwordHash: "synthetic-unused",
        },
      })
    ).id;
    otherId = (
      await prisma.user.create({
        data: {
          name: prefix + "-other",
          email: prefix + "-other@example.invalid",
          passwordHash: "synthetic-unused",
        },
      })
    ).id;
    subjectId = (await subjects.create({ name: prefix, now })).id;
    topicId = (await topics.create({ subjectId, name: prefix, now })).id;
    teacherId = (await teachers.create({ name: prefix, now })).id;
    contestId = (await contests.create({ slug: prefix, name: prefix, now })).id;
    courseId = (
      await courses.create({
        slug: prefix,
        title: prefix,
        description: "Synthetic fixture",
        contestId,
        contestName: prefix,
        now,
      })
    ).id;
    moduleId = (
      await modules.create({ courseId, subjectId, slug: prefix, title: prefix, teacherId, now })
    ).id;
    lessonId = (
      await lessons.create({ moduleId, title: prefix, durationMinutes: 2.5, teacherId, now })
    ).id;
  });
  afterAll(async () => {
    const { prisma } = await import("@/server/db/prisma");
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherId].filter(Boolean) } } });
    if (courseId) await prisma.course.delete({ where: { id: courseId } });
    if (topicId) await prisma.topic.delete({ where: { id: topicId } });
    await prisma.subject.deleteMany({ where: { name: { startsWith: prefix } } });
    if (teacherId) await prisma.teacher.delete({ where: { id: teacherId } });
    if (contestId) await prisma.contest.delete({ where: { id: contestId } });
    await prisma.achievement.deleteMany({ where: { key: { startsWith: prefix } } });
  });
  it("preserves editorial visibility, dates and fractional duration", async () => {
    expect((await courses.list()).some((x) => x.id === courseId)).toBe(false);
    await courses.update({
      id: courseId,
      status: "PUBLISHED",
      teacherName: "Real supplied metadata",
      workloadHours: 4,
      now,
    });
    expect((await courses.listByContestId(contestId))[0]).toMatchObject({
      id: courseId,
      teacherName: "Real supplied metadata",
      workloadHours: 4,
      contestName: prefix,
    });
    expect(await lessons.findById(lessonId)).toMatchObject({
      durationMinutes: 2.5,
      status: "DRAFT",
    });
    await lessons.update({
      id: lessonId,
      status: "PUBLISHED",
      videoUrl: "https://example.invalid/video",
      now,
    });
    expect(await lessons.listByModuleId(moduleId)).toHaveLength(1);
    await lessons.update({ id: lessonId, videoUrl: null, now });
    expect((await lessons.findById(lessonId))?.videoUrl).toBeNull();
  });
  it("serializes append and reorder without unique-position collisions", async () => {
    const created = await Promise.all(
      [1, 2].map((n) =>
        modules.create({ courseId, subjectId, slug: prefix + n, title: prefix + n, now }),
      ),
    );
    const rows = await modules.listByCourseIdForAdmin(courseId);
    expect(new Set(rows.map((x) => x.order)).size).toBe(3);
    const ids = [...rows].reverse().map((x) => x.id);
    expect((await modules.reorder(courseId, ids, now)).map((x) => x.id)).toEqual(ids);
    await expect(modules.reorder(courseId, [created[0]!.id], now)).rejects.toThrow("all siblings");
    const second = await lessons.create({
      moduleId,
      title: prefix + "second",
      durationMinutes: 1,
      now,
    });
    expect((await lessons.reorder(moduleId, [second.id, lessonId], now)).map((x) => x.id)).toEqual([
      second.id,
      lessonId,
    ]);
  });
  it("creates one enrollment under concurrent retries and isolates users", async () => {
    const rows = await Promise.all(
      Array.from({ length: 5 }, () => enrollments.create({ userId, courseId })),
    );
    expect(new Set(rows.map((x) => x.id)).size).toBe(1);
    expect(await enrollments.listByUserId(otherId)).toEqual([]);
  });
  it("makes completion monotonic under stale writes and restart-style reads", async () => {
    await progress.upsert({
      userId,
      lessonId,
      status: "completed",
      watchedPercent: 0.9,
      completedAt: now.toISOString(),
    });
    await Promise.all(
      [0.2, 0.6].map((watchedPercent) =>
        progress.upsert({
          userId,
          lessonId,
          status: "in_progress",
          watchedPercent,
          completedAt: null,
        }),
      ),
    );
    expect(
      await new PrismaLessonProgressRepository().findByUserAndLesson(userId, lessonId),
    ).toMatchObject({ status: "completed", watchedPercent: 0.9, completedAt: now.toISOString() });
    expect(await progress.listByUserId(otherId)).toEqual([]);
  });
  it("persists all privacy flags and nullable updates with batched isolation", async () => {
    await profiles.create({ userId, now });
    await profiles.update({ userId, bio: "private", birthDate: "2000-01-01T00:00:00Z", now });
    await profiles.updatePrivacy({ userId, showStudyHours: false, showPerformance: false, now });
    await profiles.update({ userId, bio: null, now });
    expect(await profiles.findByUserIds([userId, otherId])).toEqual([
      expect.objectContaining({
        userId,
        bio: null,
        birthDate: "2000-01-01T00:00:00.000Z",
        showStudyHours: false,
        showPerformance: false,
        isProfilePublic: false,
      }),
    ]);
  });
  it("stores notification JSON and rolls back a partially invalid batch", async () => {
    await notifications.createMany([
      { userId, type: "SYSTEM", title: prefix, message: "synthetic", data: { safe: true }, now },
    ]);
    expect(await notifications.listByUserId(otherId)).toEqual([]);
    await expect(
      notifications.createMany([
        { userId, type: "SYSTEM", title: prefix, message: "must rollback", now },
        { userId: "missing-" + prefix, type: "SYSTEM", title: prefix, message: "invalid", now },
      ]),
    ).rejects.toThrow();
    expect(await notifications.listByUserId(userId)).toHaveLength(1);
  });
  it("preserves achievement metadata and excludes deleted records", async () => {
    const a = await achievements.create({
      key: prefix,
      name: prefix,
      criteria: { kind: "metadata" },
      now,
    });
    expect(await achievements.findByKey(prefix)).toMatchObject({ criteria: { kind: "metadata" } });
    await achievements.update({ id: a.id, criteria: null, description: "updated", now });
    expect((await achievements.findById(a.id))?.criteria).toBeNull();
    await achievements.softDelete(a.id, now);
    expect((await achievements.list()).some((x) => x.id === a.id)).toBe(false);
  });
  it("handles taxonomy collisions and soft deletion without changing related identifiers", async () => {
    const extra = await subjects.create({ name: prefix, now });
    expect(extra.id).not.toBe(subjectId);
    await subjects.softDelete(extra.id, now);
    expect((await subjects.list()).some((x) => x.id === extra.id)).toBe(false);
    await topics.update({ id: topicId, name: prefix + "new", now });
    expect((await topics.listBySubjectId(subjectId))[0]?.id).toBe(topicId);
    await teachers.update({ id: teacherId, bio: "bio", now });
    await teachers.update({ id: teacherId, bio: null, now });
    expect((await teachers.findById(teacherId))?.bio).toBeNull();
  });
});
