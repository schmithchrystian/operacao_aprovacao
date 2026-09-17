// @vitest-environment node
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PrismaStudySessionRepository } from "@/server/repositories/prisma/study-session-repository";
import { PrismaFocusSessionRepository } from "@/server/repositories/prisma/focus-session-repository";
import { PrismaStudyPlanRepository } from "@/server/repositories/prisma/study-plan-repository";
import { PrismaStudyPlanItemRepository } from "@/server/repositories/prisma/study-plan-item-repository";
import { PrismaStudyMissionRepository } from "@/server/repositories/prisma/study-mission-repository";
import { PrismaDailyGoalRepository } from "@/server/repositories/prisma/daily-goal-repository";
import { PrismaWeeklyGoalRepository } from "@/server/repositories/prisma/weekly-goal-repository";
import { PrismaUserStreakRepository } from "@/server/repositories/prisma/user-streak-repository";
import type { StudySessionEntity } from "@/server/repositories/contracts/study-session-repository";

describe.skipIf(!process.env.TEST_DATABASE_URL)("PostgreSQL tracking persistence", () => {
  const prefix = "tracking-" + randomUUID(),
    now = new Date("2026-09-14T00:00:00Z"),
    later = new Date("2026-09-14T00:00:15Z");
  const sessions = new PrismaStudySessionRepository(),
    focus = new PrismaFocusSessionRepository(),
    plans = new PrismaStudyPlanRepository(),
    items = new PrismaStudyPlanItemRepository(),
    missions = new PrismaStudyMissionRepository(),
    daily = new PrismaDailyGoalRepository(),
    weekly = new PrismaWeeklyGoalRepository(),
    streaks = new PrismaUserStreakRepository();
  let userId: string, otherId: string, courseId: string, lessonId: string;
  beforeAll(async () => {
    const { prisma } = await import("@/server/db/prisma");
    userId = (
      await prisma.user.create({
        data: {
          name: prefix,
          email: prefix + "@example.invalid",
          passwordHash: "unused-synthetic",
        },
      })
    ).id;
    otherId = (
      await prisma.user.create({
        data: {
          name: prefix,
          email: prefix + "other@example.invalid",
          passwordHash: "unused-synthetic",
        },
      })
    ).id;
    const course = await prisma.course.create({
      data: {
        title: prefix,
        slug: prefix,
        description: "synthetic",
        modules: {
          create: {
            title: prefix,
            order: 1,
            lessons: { create: { title: prefix, order: 1, durationSeconds: 120 } },
          },
        },
      },
      include: { modules: { include: { lessons: true } } },
    });
    courseId = course.id;
    lessonId = course.modules[0]!.lessons[0]!.id;
  });
  afterAll(async () => {
    const { prisma } = await import("@/server/db/prisma");
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherId].filter(Boolean) } } });
    if (courseId) await prisma.course.delete({ where: { id: courseId } });
  });
  it("isolates identical client session IDs, persists aggregate and accepted activity history", async () => {
    const base: StudySessionEntity = {
      id: "same-client",
      userId,
      lessonId,
      source: "LESSON",
      status: "ACTIVE",
      startedAt: now.toISOString(),
      lastHeartbeatAt: now.toISOString(),
      lastPositionSeconds: 0,
      lastClientTimestamp: 1,
      coveredIntervals: [],
      validSeconds: 0,
      heartbeatCount: 1,
      updatedAt: now.toISOString(),
    };
    await sessions.saveSession(base);
    await sessions.saveSession({ ...base, userId: otherId });
    const advanced = {
      ...base,
      lastHeartbeatAt: later.toISOString(),
      lastPositionSeconds: 15,
      lastClientTimestamp: 2,
      coveredIntervals: [{ startSeconds: 0, endSeconds: 15 }],
      validSeconds: 15,
      heartbeatCount: 2,
      updatedAt: later.toISOString(),
    };
    await sessions.saveSession(advanced);
    await sessions.saveSession(advanced);
    await sessions.saveSession(base);
    expect(
      await new PrismaStudySessionRepository().findSession(userId, lessonId, "same-client"),
    ).toMatchObject({ validSeconds: 15, heartbeatCount: 2 });
    expect(await sessions.findSession(otherId, lessonId, "same-client")).toMatchObject({
      validSeconds: 0,
      heartbeatCount: 1,
    });
    expect(await sessions.listSessionsByUserAndLesson(userId, lessonId)).toHaveLength(1);
    expect(await sessions.listRecentSessionsByUserId(userId, later.toISOString())).toHaveLength(1);
    const { prisma } = await import("@/server/db/prisma");
    expect(await prisma.studyActivity.count({ where: { session: { userId } } })).toBe(2);
  });
  it("enforces one focus session and prevents cross-user saves or reopening", async () => {
    const input = {
      userId,
      mode: "25_5" as const,
      targetSeconds: 1500,
      breakSeconds: 300,
      subjectId: null,
      topicId: null,
      objective: "synthetic",
      now,
    };
    const rows = await Promise.all([focus.create(input), focus.create(input)]);
    expect(rows[0]!.id).toBe(rows[1]!.id);
    const row = rows[0]!;
    expect(await focus.findById(otherId, row.id)).toBeNull();
    await expect(focus.save({ ...row, userId: otherId })).rejects.toThrow("not found");
    const progressed = await focus.save({
      ...row,
      activeSeconds: 15,
      heartbeatCount: 1,
      validHeartbeatCount: 1,
      lastClientTimestamp: 1,
      lastHeartbeatAt: later.toISOString(),
      updatedAt: later.toISOString(),
    });
    await focus.save(progressed);
    await focus.save({ ...progressed, status: "FINISHED", endedAt: later.toISOString() });
    await focus.save(row);
    expect(await focus.findActiveByUserId(userId)).toBeNull();
    expect(await focus.findById(userId, row.id)).toMatchObject({
      status: "FINISHED",
      activeSeconds: 15,
    });
    const { prisma } = await import("@/server/db/prisma");
    expect(await prisma.focusActivity.count({ where: { sessionId: row.id } })).toBe(1);
  });
  it("keeps one active plan and rolls back item replacement atomically", async () => {
    const input = { userId, title: prefix, startDate: now.toISOString(), endDate: null, now };
    const rows = await Promise.all(Array.from({ length: 8 }, () => plans.create(input)));
    expect(new Set(rows.map((row) => row.id)).size).toBe(1);
    const studyPlanId = rows[0]!.id;
    const created = await items.createMany(
      [0, 1].map((order) => ({
        studyPlanId,
        kind: "REVIEW",
        subjectId: null,
        topicId: null,
        lessonId: null,
        title: prefix + order,
        targetDate: now.toISOString(),
        estimatedMinutes: 20,
        order,
        now,
      })),
    );
    expect(
      (await items.reorder(studyPlanId, [created[1]!.id, created[0]!.id], later)).map(
        (x) => x.order,
      ),
    ).toEqual([0, 1]);
    await expect(items.reorder(studyPlanId, [created[0]!.id], now)).rejects.toThrow(
      "all plan items",
    );
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    await expect(
      inRepositoryTransaction(async () => {
        await items.deleteByPlanId(studyPlanId);
        throw new Error("synthetic rollback");
      }),
    ).rejects.toThrow("synthetic rollback");
    expect(await items.listByPlanId(studyPlanId)).toHaveLength(2);
    expect(await items.update({ id: created[0]!.id, status: "DONE", now: later })).toMatchObject({
      completedAt: later.toISOString(),
    });
    expect(await plans.listByUserId(otherId)).toEqual([]);
    await plans.update({ id: studyPlanId, status: "ARCHIVED", now: later });
    expect(await plans.findActiveByUserId(userId)).toBeNull();
  });
  it("validates mission JSON and scopes access to the owner", async () => {
    const blocks = [
      { type: "revisao" as const, label: "Revisar", title: prefix, minutes: 10, contentRef: null },
    ];
    const row = await missions.create({ userId, blocks, totalMinutes: 10, now });
    expect(await missions.findById(otherId, row.id)).toBeNull();
    expect(await missions.findById(userId, row.id)).toMatchObject({
      blocks,
      totalMinutes: 10,
      currentBlockIndex: 0,
    });
  });
  it("never regresses achieved daily or weekly goals on concurrent stale updates", async () => {
    const input = {
      userId,
      date: now.toISOString(),
      targetMinutes: 20,
      targetPoints: null,
      achieved: true,
      achievedAt: later.toISOString(),
      now: later,
    };
    await daily.upsert(input);
    await Promise.all(
      [1, 2].map(() => daily.upsert({ ...input, achieved: false, achievedAt: null, now })),
    );
    expect(await daily.findByUserIdAndDate(userId, input.date)).toMatchObject({
      achieved: true,
      achievedAt: later.toISOString(),
    });
    expect(await daily.listByUserId(userId)).toHaveLength(1);
    const week = {
      userId,
      weekStart: now.toISOString(),
      targetMinutes: 120,
      targetPoints: null,
      achieved: true,
      achievedAt: later.toISOString(),
      now: later,
    };
    await weekly.upsert(week);
    await weekly.upsert({ ...week, achieved: false, achievedAt: null, now });
    expect(await weekly.findByUserIdAndWeekStart(userId, week.weekStart)).toMatchObject({
      achieved: true,
    });
    expect(await weekly.listByUserId(otherId)).toEqual([]);
  });
  it("keeps longest streak and rejects stale recalculation effects", async () => {
    await streaks.upsert({
      userId,
      currentStreak: 8,
      longestStreak: 8,
      lastActiveDate: now.toISOString(),
      freezesAvailable: 1,
      now: later,
    });
    await streaks.upsert({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: null,
      freezesAvailable: 0,
      now,
    });
    expect(await streaks.findByUserId(userId)).toMatchObject({
      currentStreak: 8,
      longestStreak: 8,
      freezesAvailable: 1,
    });
    expect(await streaks.findByUserId(otherId)).toBeNull();
  });
  it("aggregates focus and video deltas with fractional time across midnight", async () => {
    const start = "2026-09-13T23:59:55.000Z",
      end = "2026-09-14T00:00:05.500Z";
    const base: StudySessionEntity = {
      id: "midnight",
      userId,
      lessonId,
      source: "LESSON",
      status: "ACTIVE",
      startedAt: start,
      lastHeartbeatAt: start,
      lastPositionSeconds: 0,
      lastClientTimestamp: 1,
      coveredIntervals: [],
      validSeconds: 0,
      heartbeatCount: 1,
      updatedAt: start,
    };
    await sessions.saveSession(base);
    await sessions.saveSession({
      ...base,
      lastHeartbeatAt: end,
      lastPositionSeconds: 10.5,
      lastClientTimestamp: 2,
      coveredIntervals: [{ startSeconds: 0, endSeconds: 10.5 }],
      validSeconds: 10.5,
      heartbeatCount: 2,
      updatedAt: end,
    });
    const { listUserActivitySamples } =
      await import("@/server/services/study-tracking/activity-samples");
    const { sumValidSecondsByDate } =
      await import("@/server/services/study-tracking/activity-days");
    const samples = await listUserActivitySamples(userId);
    expect(samples.some((row) => row.lessonId === null && row.validSeconds === 15)).toBe(true);
    const days = sumValidSecondsByDate(samples, "UTC");
    expect(days.get("2026-09-13T00:00:00.000Z")).toBe(5);
    expect(days.get("2026-09-14T00:00:00.000Z")).toBe(35.5);
  });
  it("preserves fractional video and focus seconds across Sao Paulo midnight without replay credit", async () => {
    const start = "2026-09-15T02:59:55.250Z";
    const end = "2026-09-15T03:00:05.750Z";
    const video: StudySessionEntity = {
      id: "sao-paulo-midnight",
      userId: otherId,
      lessonId,
      source: "LESSON",
      status: "ACTIVE",
      startedAt: start,
      lastHeartbeatAt: start,
      lastPositionSeconds: 0,
      lastClientTimestamp: 1,
      coveredIntervals: [],
      validSeconds: 0,
      heartbeatCount: 1,
      updatedAt: start,
    };
    await sessions.saveSession(video);
    const acceptedVideo = {
      ...video,
      lastHeartbeatAt: end,
      lastPositionSeconds: 10.5,
      lastClientTimestamp: 2,
      coveredIntervals: [{ startSeconds: 0, endSeconds: 10.5 }],
      validSeconds: 10.5,
      heartbeatCount: 2,
      updatedAt: end,
    };
    await sessions.saveSession(acceptedVideo);
    await sessions.saveSession(acceptedVideo);
    const focusSession = await focus.create({
      userId: otherId,
      mode: "25_5",
      targetSeconds: 1500,
      breakSeconds: 300,
      subjectId: null,
      topicId: null,
      objective: "midnight fixture",
      now: new Date(start),
    });
    const acceptedFocus = {
      ...focusSession,
      activeSeconds: 10.5,
      heartbeatCount: 1,
      validHeartbeatCount: 1,
      lastClientTimestamp: 2,
      lastHeartbeatAt: end,
      updatedAt: end,
    };
    await focus.save(acceptedFocus);
    await focus.save(acceptedFocus);
    const { listUserActivitySamples } =
      await import("@/server/services/study-tracking/activity-samples");
    const { sumValidSecondsByDate, validSecondsWithinWindow } =
      await import("@/server/services/study-tracking/activity-days");
    const samples = await listUserActivitySamples(otherId);
    expect(samples).toHaveLength(2);
    expect(samples.map((sample) => sample.validSeconds)).toEqual([10.5, 10.5]);
    expect([...sumValidSecondsByDate(samples, "America/Sao_Paulo")]).toEqual([
      ["2026-09-14T00:00:00.000Z", 9.5],
      ["2026-09-15T00:00:00.000Z", 11.5],
    ]);
    expect(
      samples.reduce(
        (sum, sample) =>
          sum +
          validSecondsWithinWindow(
            sample,
            new Date("2026-09-15T03:00:00Z"),
            new Date("2026-09-16T03:00:00Z"),
          ),
        0,
      ),
    ).toBe(11.5);
  });
});
