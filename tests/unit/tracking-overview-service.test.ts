import { ensureAuthenticatedUser } from "../helpers/authenticated-user";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({ auth: authMock }));

// Importados após o mock de "@/server/auth" — mesmo padrão de `tests/unit/study-tracking-service.test.ts`.
const { recordHeartbeat } = await import("@/server/services/study-tracking");
const { getTrackingOverview } = await import("@/server/services/study-tracking/tracking-overview");
const { getRepositories } = await import("@/server/repositories");
const { __resetMockStudySessionStore } = await import("@/server/repositories/mock/study-session-repository");
const { __resetMockLessonProgressStore } = await import("@/server/repositories/mock/lesson-progress-repository");
const { __resetMockGamificationEventStore } = await import(
  "@/server/repositories/mock/gamification-event-repository"
);
const { __resetMockPointTransactionStore } = await import(
  "@/server/repositories/mock/point-transaction-repository"
);
const { __resetMockUserAchievementStore } = await import("@/server/repositories/mock/user-achievement-repository");
const { __resetMockUserStreakStore } = await import("@/server/repositories/mock/user-streak-repository");
const { __resetMockDailyGoalStore } = await import("@/server/repositories/mock/daily-goal-repository");
const { __resetMockWeeklyGoalStore } = await import("@/server/repositories/mock/weekly-goal-repository");
const { __resetHeartbeatRateLimitStore } = await import("@/server/services/study-tracking/rate-limit");

/**
 * Testes de integração do serviço de acompanhamento (Fase 12 — `getTrackingOverview`). O foco
 * principal (CLAUDE.md §14/§25) é provar que a AGREGAÇÃO nunca infla horas a partir de sinais
 * que a Fase 7 (heartbeat/tempo válido, `@/server/services/study-tracking/record-heartbeat.ts`)
 * já descarta — heartbeat duplicado e aba oculta — sem reimplementar essa regra aqui: o teste
 * dirige o fluxo REAL de `recordHeartbeat` e só verifica o resultado agregado.
 */

function fakeSession(id: string): NextAuthSession {
  ensureAuthenticatedUser(id);
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

const LESSON_ID = "course-1-m1-l1";
const BASE_TIME = Date.parse("2026-07-13T10:00:00.000Z"); // segunda-feira

interface HeartbeatOverrides {
  positionSeconds?: number;
  playing?: boolean;
  tabVisible?: boolean;
  playbackRate?: number;
  clientTimestamp?: number;
}

function heartbeat(overrides: HeartbeatOverrides = {}) {
  return {
    lessonId: LESSON_ID,
    sessionId: "session-tov-1",
    positionSeconds: overrides.positionSeconds ?? 0,
    durationSeconds: 1800,
    playing: overrides.playing ?? true,
    tabVisible: overrides.tabVisible ?? true,
    playbackRate: overrides.playbackRate ?? 1,
    clientTimestamp: overrides.clientTimestamp ?? 1,
  };
}

async function enrollUser(userId: string, courseId = "course-1"): Promise<void> {
  await getRepositories().enrollments.create({ userId, courseId });
}

function resetAllStores(): void {
  __resetMockStudySessionStore();
  __resetMockLessonProgressStore();
  __resetMockGamificationEventStore();
  __resetMockPointTransactionStore();
  __resetMockUserAchievementStore();
  __resetMockUserStreakStore();
  __resetMockDailyGoalStore();
  __resetMockWeeklyGoalStore();
  __resetHeartbeatRateLimitStore();
}

describe("study-tracking/tracking-overview — getTrackingOverview (Fase 12, integração)", () => {
  beforeEach(() => {
    authMock.mockReset();
    resetAllStores();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tempo inativo/duplicado NÃO infla as horas agregadas (reaproveita a regra da Fase 7)", async () => {
    const userId = "tov-hours";
    authMock.mockResolvedValue(fakeSession(userId));
    await enrollUser(userId);

    await recordHeartbeat(userId, heartbeat({ positionSeconds: 0, clientTimestamp: 1 }));

    // 6 ticks reais de 25s (rate 2x => 50s de vídeo por tick) = 150s de TEMPO VÁLIDO (clock).
    for (let tick = 1; tick <= 6; tick += 1) {
      vi.setSystemTime(BASE_TIME + tick * 25_000);
      await recordHeartbeat(
        userId,
        heartbeat({ positionSeconds: tick * 50, playbackRate: 2, clientTimestamp: tick + 1 }),
      );
    }

    // Heartbeat DUPLICADO (mesmo clientTimestamp do último tick, "7") — não deve somar mais
    // tempo. Espaçado >5s do tick anterior (`STUDY_TRACKING.heartbeatMinClientIntervalMs`) para
    // não ser barrado pelo rate limit leve — não é isso que este teste quer exercitar.
    vi.setSystemTime(BASE_TIME + 6 * 25_000 + 7_000);
    await recordHeartbeat(userId, heartbeat({ positionSeconds: 305, playbackRate: 2, clientTimestamp: 7 }));

    // Heartbeat com ABA OCULTA (timestamp novo) — não deve somar tempo.
    vi.setSystemTime(BASE_TIME + 6 * 25_000 + 14_000);
    await recordHeartbeat(userId, heartbeat({ positionSeconds: 330, tabVisible: false, clientTimestamp: 8 }));

    const sessions = await getRepositories().studySessions.listSessionsByUserAndLesson(userId, LESSON_ID);
    const totalValidSeconds = sessions.reduce((sum, session) => sum + session.validSeconds, 0);
    expect(totalValidSeconds).toBe(150); // só os 6 ticks reais contaram — duplicado/oculto = 0

    const now = new Date(BASE_TIME + 6 * 25_000 + 30_000);
    const overview = await getTrackingOverview(userId, now);

    expect(overview.hours.todayMinutes).toBe(Math.floor(totalValidSeconds / 60));
    expect(overview.hours.weekMinutes).toBe(Math.floor(totalValidSeconds / 60));
    // Sanidade: se o heartbeat duplicado/oculto tivesse sido contado, passaria de 150s (2min)
    // para 200s+ (3min) — o teste falharia aqui.
    expect(overview.hours.todayMinutes).toBe(2);
  });

  it("conta aulas concluídas a partir do LessonProgressRepository real", async () => {
    const userId = "tov-lessons";
    authMock.mockResolvedValue(fakeSession(userId));
    await enrollUser(userId);

    await getRepositories().lessonProgress.upsert({
      userId,
      lessonId: "lesson-a",
      status: "completed",
      watchedPercent: 1,
      completedAt: new Date(BASE_TIME).toISOString(),
    });
    await getRepositories().lessonProgress.upsert({
      userId,
      lessonId: "lesson-b",
      status: "in_progress",
      watchedPercent: 0.4,
      completedAt: null,
    });

    const overview = await getTrackingOverview(userId, new Date(BASE_TIME));
    expect(overview.lessonsCompleted).toBe(1);
  });

  it("agrega questões respondidas/acertos, ignorando questões em branco", async () => {
    const userId = "tov-questions";
    authMock.mockResolvedValue(fakeSession(userId));
    await enrollUser(userId);

    const repos = getRepositories();
    const now = new Date(BASE_TIME);
    await repos.questionAttempts.upsertForMockExamAttempt({
      userId,
      questionId: "question-portugues-01",
      mockExamAttemptId: null,
      selectedOptionId: "some-option",
      isCorrect: true,
      timeSpentSeconds: 40,
      now,
    });
    await repos.questionAttempts.upsertForMockExamAttempt({
      userId,
      questionId: "question-portugues-01",
      mockExamAttemptId: null,
      selectedOptionId: "some-other-option",
      isCorrect: false,
      timeSpentSeconds: 60,
      now,
    });
    await repos.questionAttempts.upsertForMockExamAttempt({
      userId,
      questionId: "question-portugues-01",
      mockExamAttemptId: null,
      selectedOptionId: null, // em branco — não deve contar como "respondida"
      isCorrect: null,
      timeSpentSeconds: null,
      now,
    });

    const overview = await getTrackingOverview(userId, now);
    expect(overview.questions.totalAnswered).toBe(2);
    expect(overview.questions.totalCorrect).toBe(1);
    expect(overview.questions.accuracyPercent).toBe(50);
    expect(overview.questions.averageSecondsPerQuestion).toBe(50); // média de 40 e 60
  });

  it("lança erro (anti-IDOR) quando o usuário autenticado tenta ler o acompanhamento de outro aluno", async () => {
    authMock.mockResolvedValue(fakeSession("tov-user-a"));

    await expect(getTrackingOverview("tov-user-b", new Date(BASE_TIME))).rejects.toThrow();
  });

  it("lança erro quando não há sessão autenticada", async () => {
    authMock.mockResolvedValue(null);

    await expect(getTrackingOverview("tov-anyone", new Date(BASE_TIME))).rejects.toThrow();
  });
});
