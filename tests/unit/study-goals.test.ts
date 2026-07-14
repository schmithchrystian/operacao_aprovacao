import { beforeEach, describe, expect, it, vi } from "vitest";

// `goals.ts` importa `@/server/services/gamification` (para emitir `DailyGoalCompleted`/
// `WeeklyGoalCompleted`), que depende transitivamente de `@/server/auth` — mockar ANTES de
// importar o módulo sob teste (mesmo padrão de `tests/unit/gamification-engine.test.ts`).
vi.mock("@/server/auth", () => ({ auth: vi.fn() }));

const { isGoalAchieved, recalculateDailyGoal, recalculateWeeklyGoal } = await import(
  "@/server/services/study-tracking/goals"
);
const { getRepositories } = await import("@/server/repositories");
const { __resetMockDailyGoalStore } = await import("@/server/repositories/mock/daily-goal-repository");
const { __resetMockWeeklyGoalStore } = await import("@/server/repositories/mock/weekly-goal-repository");
const { __resetMockStudySessionStore } = await import("@/server/repositories/mock/study-session-repository");
const { __resetMockGamificationEventStore } = await import(
  "@/server/repositories/mock/gamification-event-repository"
);
const { __resetMockPointTransactionStore } = await import(
  "@/server/repositories/mock/point-transaction-repository"
);
const { __resetMockUserAchievementStore } = await import("@/server/repositories/mock/user-achievement-repository");

/**
 * Testes de meta diária/semanal — Fase 12 (CLAUDE.md §14/§15/§31). `isGoalAchieved` é o núcleo
 * puro do critério de conclusão; `recalculateDailyGoal`/`recalculateWeeklyGoal` são os testes de
 * integração — conclui uma única vez e emite o evento de gamificação correspondente de forma
 * idempotente (nunca 2x, mesmo chamado repetidamente com os mesmos dados).
 */

describe("study-tracking/goals — isGoalAchieved (puro)", () => {
  it("meta sem nenhum alvo definido nunca é considerada concluída", () => {
    expect(
      isGoalAchieved({ targetPoints: null, targetMinutes: null, progressPoints: 999, progressMinutes: 999 }),
    ).toBe(false);
  });

  it("alvo de pontos: só conclui quando o progresso atinge o alvo", () => {
    expect(
      isGoalAchieved({ targetPoints: 150, targetMinutes: null, progressPoints: 149, progressMinutes: 0 }),
    ).toBe(false);
    expect(
      isGoalAchieved({ targetPoints: 150, targetMinutes: null, progressPoints: 150, progressMinutes: 0 }),
    ).toBe(true);
  });

  it("com os dois alvos definidos, exige ambos (semântica E, não OU)", () => {
    expect(
      isGoalAchieved({ targetPoints: 150, targetMinutes: 30, progressPoints: 150, progressMinutes: 10 }),
    ).toBe(false); // pontos ok, minutos não
    expect(
      isGoalAchieved({ targetPoints: 150, targetMinutes: 30, progressPoints: 150, progressMinutes: 30 }),
    ).toBe(true);
  });
});

describe("study-tracking/goals — recalculateDailyGoal (Fase 12, integração)", () => {
  beforeEach(() => {
    __resetMockDailyGoalStore();
    __resetMockWeeklyGoalStore();
    __resetMockStudySessionStore();
    __resetMockGamificationEventStore();
    __resetMockPointTransactionStore();
    __resetMockUserAchievementStore();
  });

  const DAY = new Date("2026-07-13T09:00:00.000Z");

  async function seedPoints(userId: string, points: number, suffix: string, when: Date = DAY): Promise<void> {
    await getRepositories().pointTransactions.create({
      userId,
      gamificationEventId: null,
      idempotencyKey: `test-seed:${userId}:${suffix}`,
      type: "EARN",
      points,
      xp: points,
      reason: "seed de teste",
      now: when,
    });
  }

  it("meta diária NÃO conclui abaixo do alvo (150 pontos default)", async () => {
    const userId = "daily-goal-below";
    await seedPoints(userId, 90, "a");

    const goal = await recalculateDailyGoal(userId, DAY);
    expect(goal.progressPoints).toBe(90);
    expect(goal.targetPoints).toBe(150);
    expect(goal.achieved).toBe(false);
    expect(goal.achievedAt).toBeNull();
  });

  it("meta diária conclui UMA VEZ ao atingir o alvo e emite DailyGoalCompleted idempotente", async () => {
    const userId = "daily-goal-complete";
    await seedPoints(userId, 100, "a");
    await seedPoints(userId, 60, "b"); // total 160 >= 150

    const first = await recalculateDailyGoal(userId, DAY);
    expect(first.achieved).toBe(true);
    expect(first.achievedAt).not.toBeNull();

    const repos = getRepositories();
    const events = await repos.gamificationEvents.listByUserId(userId);
    expect(events.filter((event) => event.type === "DAILY_GOAL_COMPLETED")).toHaveLength(1);
    const { points } = await repos.pointTransactions.sumByUserId(userId);
    expect(points).toBe(160 + 150); // 160 do ledger de estudo + 150 do bônus de meta batida

    // Recalcular de novo no MESMO dia (nenhum ponto novo) não deve reemitir nem recreditar.
    const second = await recalculateDailyGoal(userId, DAY);
    expect(second.achieved).toBe(true);
    expect(second.achievedAt).toBe(first.achievedAt); // nunca muda depois de concluída
    const eventsAfter = await repos.gamificationEvents.listByUserId(userId);
    expect(eventsAfter.filter((event) => event.type === "DAILY_GOAL_COMPLETED")).toHaveLength(1);
    const { points: pointsAfter } = await repos.pointTransactions.sumByUserId(userId);
    expect(pointsAfter).toBe(160 + 150); // nunca dobra
  });

  it("pontos de um dia diferente não contam para a meta do dia consultado", async () => {
    const userId = "daily-goal-other-day";
    await seedPoints(userId, 500, "a", new Date("2026-07-12T09:00:00.000Z")); // dia anterior

    const goal = await recalculateDailyGoal(userId, DAY);
    expect(goal.progressPoints).toBe(0);
    expect(goal.achieved).toBe(false);
  });
});

describe("study-tracking/goals — recalculateWeeklyGoal (Fase 12, integração)", () => {
  beforeEach(() => {
    __resetMockDailyGoalStore();
    __resetMockWeeklyGoalStore();
    __resetMockStudySessionStore();
    __resetMockGamificationEventStore();
    __resetMockPointTransactionStore();
    __resetMockUserAchievementStore();
  });

  // 2026-07-13 é uma segunda-feira — início de semana civil (weekStartIso).
  const MONDAY = new Date("2026-07-13T09:00:00.000Z");
  const TUESDAY = new Date("2026-07-14T09:00:00.000Z");

  async function seedPoints(userId: string, points: number, suffix: string, when: Date): Promise<void> {
    await getRepositories().pointTransactions.create({
      userId,
      gamificationEventId: null,
      idempotencyKey: `test-seed:${userId}:${suffix}`,
      type: "EARN",
      points,
      xp: points,
      reason: "seed de teste",
      now: when,
    });
  }

  it("soma pontos de vários dias da MESMA semana civil e conclui uma vez ao atingir 500", async () => {
    const userId = "weekly-goal-complete";
    await seedPoints(userId, 300, "mon", MONDAY);
    await seedPoints(userId, 250, "tue", TUESDAY); // total 550 >= 500

    const first = await recalculateWeeklyGoal(userId, TUESDAY);
    expect(first.weekStart).toBe("2026-07-13T00:00:00.000Z");
    expect(first.progressPoints).toBe(550);
    expect(first.achieved).toBe(true);

    const repos = getRepositories();
    const events = await repos.gamificationEvents.listByUserId(userId);
    expect(events.filter((event) => event.type === "WEEKLY_GOAL_COMPLETED")).toHaveLength(1);

    // Recalcular de novo (mesma semana, sem pontos novos) não reemite.
    const second = await recalculateWeeklyGoal(userId, TUESDAY);
    expect(second.achieved).toBe(true);
    const eventsAfter = await repos.gamificationEvents.listByUserId(userId);
    expect(eventsAfter.filter((event) => event.type === "WEEKLY_GOAL_COMPLETED")).toHaveLength(1);
  });

  it("não conclui quando a soma da semana fica abaixo do alvo", async () => {
    const userId = "weekly-goal-below";
    await seedPoints(userId, 100, "mon", MONDAY);

    const goal = await recalculateWeeklyGoal(userId, TUESDAY);
    expect(goal.progressPoints).toBe(100);
    expect(goal.achieved).toBe(false);
  });
});
