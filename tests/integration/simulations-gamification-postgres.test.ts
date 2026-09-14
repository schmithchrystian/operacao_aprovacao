// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));
const testUrl = process.env.TEST_DATABASE_URL;
const prefix = `simulation-test-${randomUUID()}`;
const userId = `${prefix}-user`;
const subjectId = `${prefix}-subject`;
const achievementKey = `${prefix}-badge`;
const now = new Date("2026-09-14T00:00:00Z");
let prisma: typeof import("@/server/db/prisma").prisma;
let repos: ReturnType<typeof import("@/server/repositories").getRepositories>;
let questionId: string;
let optionId: string;
let examId: string;
let attemptId: string;

describe.skipIf(!testUrl)("simulations and gamification — isolated PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !url.pathname.includes("test")
    )
      throw new Error("Use a local test database.");
    process.env.DATABASE_URL = testUrl;
    process.env.DATA_SOURCE = "prisma";
    ({ prisma } = await import("@/server/db/prisma"));
    repos = (await import("@/server/repositories")).getRepositories();
    await prisma.user.create({
      data: {
        id: userId,
        name: "Synthetic test",
        email: `${prefix}@example.invalid`,
        passwordHash: "not-a-login-hash",
      },
    });
    await prisma.subject.create({ data: { id: subjectId, slug: subjectId, name: prefix } });
    await prisma.achievement.create({ data: { key: achievementKey, name: "Synthetic badge" } });
    const question = await repos.questions.create({
      statement: "Synthetic question",
      subjectId,
      topicId: null,
      board: null,
      difficulty: "EASY",
      explanation: "Synthetic explanation",
      now,
    });
    questionId = question.id;
    await repos.questions.update({ id: questionId, status: "PUBLISHED", now });
    const options = await repos.questionOptions.replaceForQuestion(questionId, [
      { label: "A", text: "Correct", isCorrect: true },
      { label: "B", text: "Incorrect", isCorrect: false },
    ]);
    optionId = options[0]!.id;
    const exam = await repos.mockExams.createCatalog({
      title: prefix,
      description: null,
      durationMinutes: 10,
      questionIds: [questionId],
      createdById: null,
      now,
    });
    examId = exam.id;
    await repos.mockExams.update({ id: examId, status: "PUBLISHED", now });
    attemptId = (
      await repos.mockExamAttempts.create({
        userId,
        mockExamId: examId,
        timeLimitSeconds: 600,
        now,
      })
    ).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.domainOutbox.deleteMany({ where: { idempotencyKey: { contains: userId } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: userId } });
    await prisma.pointTransaction.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.achievement.deleteMany({ where: { key: achievementKey } });
    await prisma.mockExam.deleteMany({ where: { title: prefix } });
    await prisma.question.deleteMany({ where: { subjectId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.$disconnect();
  });

  it("persists catalog relations and excludes drafts and personal exams", async () => {
    expect((await repos.mockExams.findById(examId))?.questionIds).toEqual([questionId]);
    expect((await repos.questions.list({ subjectId })).map((q) => q.id)).toEqual([questionId]);
    expect(await repos.questions.list({ subjectId, subjectIds: [] })).toEqual([]);
    const personal = await repos.mockExams.create({
      title: prefix,
      description: null,
      durationMinutes: 5,
      questionIds: [questionId],
      createdById: null,
      now,
    });
    expect(personal.isPersonal).toBe(true);
    expect((await repos.mockExams.list()).some((exam) => exam.id === personal.id)).toBe(false);
  });

  it("makes content used in an attempt immutable with a domain conflict", async () => {
    await expect(
      repos.questions.update({ id: questionId, statement: "Changed", now }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      repos.questionOptions.replaceForQuestion(questionId, [
        { label: "A", text: "Changed", isCorrect: false },
      ]),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      repos.mockExams.update({ id: examId, questionIds: [], now }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await repos.questionOptions.findById(optionId))?.isCorrect).toBe(true);
  });

  it("allows only one concurrent winner when finishing an attempt", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        repos.mockExamAttempts.finalize({
          id: attemptId,
          expectedVersion: 0,
          correctCount: 1,
          wrongCount: 0,
          blankCount: 0,
          scorePercent: 100,
          now,
        }),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(
      await repos.mockExamAttempts.expire({ id: attemptId, expectedVersion: 0, now }),
    ).toBeNull();
    expect((await repos.mockExamAttempts.findById(attemptId))?.version).toBe(1);
  });

  it("upserts one answer and restores all state when a unit of work fails", async () => {
    const input = {
      userId,
      questionId,
      mockExamAttemptId: attemptId,
      selectedOptionId: optionId,
      isCorrect: true,
      timeSpentSeconds: 10,
      now,
    };
    const rows = await Promise.all(
      Array.from({ length: 5 }, () => repos.questionAttempts.upsertForMockExamAttempt(input)),
    );
    expect(new Set(rows.map((row) => row.id)).size).toBe(1);
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    const attempt = await repos.mockExamAttempts.create({
      userId,
      mockExamId: examId,
      timeLimitSeconds: 600,
      now,
    });
    await expect(
      inRepositoryTransaction(async () => {
        await repos.mockExamAttempts.finalize({
          id: attempt.id,
          expectedVersion: 0,
          correctCount: 1,
          wrongCount: 0,
          blankCount: 0,
          scorePercent: 100,
          now,
        });
        await repos.questionAttempts.upsertForMockExamAttempt({
          ...input,
          mockExamAttemptId: attempt.id,
        });
        throw new Error("Injected write failure");
      }),
    ).rejects.toThrow("Injected write failure");
    expect((await repos.mockExamAttempts.findById(attempt.id))?.status).toBe("IN_PROGRESS");
    expect(await repos.questionAttempts.listByMockExamAttemptId(attempt.id)).toEqual([]);
  });

  it("creates an immutable event and ledger once under concurrent replay", async () => {
    const idempotencyKey = `${prefix}-event`;
    const events = await Promise.all(
      Array.from({ length: 6 }, () =>
        repos.gamificationEvents.create({
          userId,
          type: "QUESTION_CORRECT",
          idempotencyKey,
          sourceType: "Question",
          sourceId: questionId,
          points: 20,
          xp: 20,
          ruleVersion: 1,
          status: "PROCESSED",
          now,
        }),
      ),
    );
    expect(new Set(events.map((event) => event.id)).size).toBe(1);
    const input = {
      userId,
      gamificationEventId: events[0]!.id,
      idempotencyKey,
      type: "EARN" as const,
      points: 20,
      xp: 20,
      reason: "Synthetic award",
      now,
    };
    const transactions = await Promise.all(
      Array.from({ length: 6 }, () => repos.pointTransactions.create(input)),
    );
    expect(new Set(transactions.map((tx) => tx.id)).size).toBe(1);
    expect(
      (await repos.pointTransactions.create({ ...input, points: 999, now: new Date() })).points,
    ).toBe(20);
    expect(await repos.pointTransactions.sumByUserId(userId)).toEqual({ points: 20, xp: 20 });
  });

  it("preserves original achievement time on concurrent unlock", async () => {
    const badges = await Promise.all(
      Array.from({ length: 5 }, () => repos.userAchievements.unlock(userId, achievementKey, now)),
    );
    expect(badges.every((badge) => badge.unlockedAt === now.toISOString())).toBe(true);
    expect(
      (await repos.userAchievements.unlock(userId, achievementKey, new Date())).unlockedAt,
    ).toBe(now.toISOString());
    expect(await repos.userAchievements.listByUserId(userId)).toHaveLength(1);
  });

  it("recalculates a ranking version without overwriting older versions", async () => {
    const input = {
      userId,
      periodType: "ALL_TIME" as const,
      periodKey: prefix,
      scopeType: "GLOBAL" as const,
      scopeKey: "global",
      calculationVersion: 1,
      score: 0.5,
      rank: 1,
      now,
    };
    const original = await repos.rankingScores.upsert(input);
    expect((await repos.rankingScores.upsert({ ...input, score: 0.6 })).id).toBe(original.id);
    await repos.rankingScores.upsert({ ...input, calculationVersion: 2, score: 0.8 });
    expect(
      await repos.rankingScores.listVersionsDesc("ALL_TIME", prefix, "GLOBAL", "global"),
    ).toEqual([2, 1]);
    expect(
      (
        await repos.rankingScores.findByUserScopeAndVersion(
          userId,
          "ALL_TIME",
          prefix,
          "GLOBAL",
          "global",
          1,
        )
      )?.score,
    ).toBe(0.6);
  });
  it("rolls back a real submission after CAS, answer, event and ledger writes, then retries once", async () => {
    authMock.mockResolvedValue({ user: { id: userId, role: "aluno", sessionVersion: 0 } });
    const { submitAndFinalize } = await import("@/server/services/simulations/submit-and-finalize");
    const { eventBus } = await import("@/server/events");
    const attempt = await repos.mockExamAttempts.create({
      userId,
      mockExamId: examId,
      timeLimitSeconds: 600,
      now: new Date(),
    });
    const input = { attemptId: attempt.id, answers: [{ questionId, selectedOptionId: optionId }] };
    const before = await prisma.pointTransaction.count({ where: { userId } });
    const outboxBefore = await prisma.domainOutbox.count({
      where: { idempotencyKey: { contains: userId } },
    });
    const originalEmit = eventBus.emit.bind(eventBus);
    const injected = vi.spyOn(eventBus, "emit").mockImplementationOnce(async (event) => {
      await originalEmit(event);
      throw new Error("Injected after ledger and outbox write");
    });
    try {
      await expect(submitAndFinalize(userId, input)).rejects.toThrow(
        "Injected after ledger and outbox write",
      );
    } finally {
      injected.mockRestore();
    }
    expect((await repos.mockExamAttempts.findById(attempt.id))?.status).toBe("IN_PROGRESS");
    expect(await repos.questionAttempts.listByMockExamAttemptId(attempt.id)).toEqual([]);
    expect(await prisma.pointTransaction.count({ where: { userId } })).toBe(before);
    expect(
      await prisma.domainOutbox.count({ where: { idempotencyKey: { contains: userId } } }),
    ).toBe(outboxBefore);
    const submissions = await Promise.allSettled([
      submitAndFinalize(userId, input),
      submitAndFinalize(userId, input),
    ]);
    expect(submissions.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.pointTransaction.count({ where: { userId } })).toBe(before + 2);
    expect(
      await prisma.domainOutbox.count({
        where: { idempotencyKey: { contains: userId }, status: "PROCESSED" },
      }),
    ).toBe(outboxBefore + 2);
    await expect(submitAndFinalize(userId, input)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("commits expiration although the caller receives a conflict", async () => {
    authMock.mockResolvedValue({ user: { id: userId, role: "aluno", sessionVersion: 0 } });
    const { submitAndFinalize } = await import("@/server/services/simulations/submit-and-finalize");
    const attempt = await repos.mockExamAttempts.create({
      userId,
      mockExamId: examId,
      timeLimitSeconds: 1,
      now: new Date(Date.now() - 3600000),
    });
    await expect(
      submitAndFinalize(userId, { attemptId: attempt.id, answers: [] }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await repos.mockExamAttempts.findById(attempt.id))?.status).toBe("EXPIRED");
    expect(
      await prisma.auditLog.count({
        where: { entityId: attempt.id, action: "simulations.attempt-expired" },
      }),
    ).toBe(1);
  });

  it("persists only allowed audit metadata and survives database reconnect", async () => {
    const { auditLog } = await import("@/server/audit/log");
    await auditLog({
      operation: "test.security.audit",
      userId,
      entity: "Test",
      entityId: prefix,
      result: "success",
      correlationId: prefix,
      metadata: {
        password: "never-store",
        token: "never-store",
        nested: { secret: "never-store" },
        points: 20,
      },
    });
    await prisma.$disconnect();
    const row = await prisma.auditLog.findFirstOrThrow({
      where: { actorUserId: userId, action: "test.security.audit" },
    });
    expect(JSON.stringify(row.after)).not.toContain("never-store");
    expect(row.after).toMatchObject({ metadata: { points: 20 } });
  });
});
