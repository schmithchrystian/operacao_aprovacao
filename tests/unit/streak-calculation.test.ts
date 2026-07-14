import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `streak.ts` importa `@/server/services/gamification` (para emitir `StreakReached`), que
// importa `@/server/audit` -> (transitivamente) `@/server/authorization` -> `@/server/auth`
// (Auth.js/next-auth). Mockar ANTES de importar o módulo sob teste — mesmo padrão de
// `tests/unit/gamification-engine.test.ts`/`tests/unit/ranking-recalculate.test.ts`.
vi.mock("@/server/auth", () => ({ auth: vi.fn() }));

const { computeStreak, isFirstWeekFullyActive, toActivityDates, toCalendarDateIso, sumValidSecondsByDate } =
  await import("@/server/services/study-tracking/activity-days");
const { recalculateStreak } = await import("@/server/services/study-tracking/streak");
const { computeUserGamificationStats } = await import("@/server/services/gamification/read");
const { getRepositories } = await import("@/server/repositories");
const { __resetMockStudySessionStore } = await import("@/server/repositories/mock/study-session-repository");
const { __resetMockUserStreakStore } = await import("@/server/repositories/mock/user-streak-repository");
const { __resetMockGamificationEventStore } = await import(
  "@/server/repositories/mock/gamification-event-repository"
);
const { __resetMockPointTransactionStore } = await import(
  "@/server/repositories/mock/point-transaction-repository"
);
const { __resetMockUserAchievementStore } = await import("@/server/repositories/mock/user-achievement-repository");

/**
 * Testes da sequência (streak) de estudo — Fase 12 (CLAUDE.md §14/§31, agente `study-tracking`).
 * Dois níveis:
 * - núcleo PURO (`computeStreak`/`isFirstWeekFullyActive`/`toCalendarDateIso`/`toActivityDates`):
 *   determinístico, sem I/O, cobre quebra/tolerância/timezone;
 * - `recalculateStreak` (I/O): agrega `StudySession` REAIS e emite `StreakReached` de forma
 *   idempotente ao cruzar os marcos de 7/30 dias.
 */

describe("study-tracking/activity-days — computeStreak (puro)", () => {
  it("conta a sequência atual e a maior sequência corretamente para dias consecutivos", () => {
    const result = computeStreak(
      ["2026-07-10T00:00:00.000Z", "2026-07-11T00:00:00.000Z", "2026-07-12T00:00:00.000Z"],
      "2026-07-12T00:00:00.000Z",
    );

    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.streakBroken).toBe(false);
    expect(result.lastActiveDate).toBe("2026-07-12T00:00:00.000Z");
  });

  it("hoje sem atividade ainda registrada não quebra a sequência de ontem", () => {
    const result = computeStreak(
      ["2026-07-10T00:00:00.000Z", "2026-07-11T00:00:00.000Z"],
      "2026-07-12T00:00:00.000Z", // hoje — ainda sem heartbeat
    );

    expect(result.currentStreak).toBe(2);
    expect(result.lastActiveDate).toBe("2026-07-11T00:00:00.000Z");
  });

  it("gap de 2+ dias sem freeze quebra a sequência atual", () => {
    const result = computeStreak(
      ["2026-07-05T00:00:00.000Z", "2026-07-06T00:00:00.000Z"],
      "2026-07-10T00:00:00.000Z", // 3+ dias de gap até hoje
    );

    expect(result.currentStreak).toBe(0);
    expect(result.streakBroken).toBe(true);
  });

  it("gap de exatamente 1 dia com freeze disponível NÃO quebra (consome 1 freeze)", () => {
    // Estudou 07-10, faltou 07-11, estudou 07-12 (hoje).
    const result = computeStreak(
      ["2026-07-10T00:00:00.000Z", "2026-07-12T00:00:00.000Z"],
      "2026-07-12T00:00:00.000Z",
      1, // 1 freeze disponível
    );

    expect(result.currentStreak).toBe(2); // 07-10 e 07-12 contam; 07-11 é perdoado
    expect(result.freezesConsumed).toBe(1);
    expect(result.remainingFreezesAvailable).toBe(0);
    expect(result.streakBroken).toBe(false);
  });

  it("gap de 1 dia SEM freeze disponível quebra a sequência antes do gap", () => {
    const result = computeStreak(
      ["2026-07-10T00:00:00.000Z", "2026-07-12T00:00:00.000Z"],
      "2026-07-12T00:00:00.000Z",
      0,
    );

    // Só o dia de hoje (07-12) conta — o gap de 07-11 corta o acesso a 07-10 sem freeze.
    expect(result.currentStreak).toBe(1);
    expect(result.freezesConsumed).toBe(0);
  });

  it("sem nenhuma atividade retorna tudo zerado, sem quebra (nunca houve sequência)", () => {
    const result = computeStreak([], "2026-07-12T00:00:00.000Z");

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.streakBroken).toBe(false);
    expect(result.lastActiveDate).toBeNull();
  });

  it("maior sequência (longestStreak) é um fato histórico bruto — ignora freezes", () => {
    // Um run de 5 dias, um gap de 2 dias (quebra real, sem freeze), depois um run de 2 dias.
    const result = computeStreak(
      [
        "2026-07-01T00:00:00.000Z",
        "2026-07-02T00:00:00.000Z",
        "2026-07-03T00:00:00.000Z",
        "2026-07-04T00:00:00.000Z",
        "2026-07-05T00:00:00.000Z",
        "2026-07-08T00:00:00.000Z",
        "2026-07-09T00:00:00.000Z",
      ],
      "2026-07-09T00:00:00.000Z",
    );

    expect(result.longestStreak).toBe(5);
    expect(result.currentStreak).toBe(2);
  });

  it("é determinístico: a mesma entrada sempre produz a mesma saída", () => {
    const input = ["2026-07-10T00:00:00.000Z", "2026-07-11T00:00:00.000Z"] as const;
    const a = computeStreak(input, "2026-07-11T00:00:00.000Z", 2);
    const b = computeStreak(input, "2026-07-11T00:00:00.000Z", 2);
    expect(a).toEqual(b);
  });
});

describe("study-tracking/activity-days — isFirstWeekFullyActive (puro)", () => {
  it("true quando os 7 dias a partir do primeiro dia ativo estão todos presentes", () => {
    const dates = Array.from({ length: 7 }, (_, i) => `2026-07-0${i + 1}T00:00:00.000Z`);
    expect(isFirstWeekFullyActive(dates)).toBe(true);
  });

  it("false quando falta 1 dia dentro da primeira semana", () => {
    const dates = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-06", "2026-07-07"].map(
      (d) => `${d}T00:00:00.000Z`,
    );
    expect(isFirstWeekFullyActive(dates)).toBe(false);
  });

  it("false quando há menos de 7 dias distintos no total", () => {
    expect(isFirstWeekFullyActive(["2026-07-01T00:00:00.000Z"])).toBe(false);
  });
});

describe("study-tracking/activity-days — toCalendarDateIso / toActivityDates / sumValidSecondsByDate", () => {
  it("resolve o dia civil em UTC corretamente", () => {
    expect(toCalendarDateIso("2026-07-13T23:59:00.000Z", "UTC")).toBe("2026-07-13T00:00:00.000Z");
  });

  it("resolve o dia civil em um timezone não-UTC, cruzando a meia-noite", () => {
    // 23:30 UTC de 13/07 é só 20:30 em America/Sao_Paulo (UTC-3) — ainda dia 13 lá.
    expect(toCalendarDateIso("2026-07-13T23:30:00.000Z", "America/Sao_Paulo")).toBe("2026-07-13T00:00:00.000Z");
    // 01:30 UTC de 14/07 é 22:30 de 13/07 em America/Sao_Paulo — dia civil ainda é 13, não 14.
    expect(toCalendarDateIso("2026-07-14T01:30:00.000Z", "America/Sao_Paulo")).toBe("2026-07-13T00:00:00.000Z");
  });

  it("toActivityDates ignora sessões com validSeconds <= 0 e agrupa por dia", () => {
    const sessions = [
      { validSeconds: 120, lastHeartbeatAt: "2026-07-10T10:00:00.000Z" },
      { validSeconds: 0, lastHeartbeatAt: "2026-07-11T10:00:00.000Z" }, // não conta
      { validSeconds: 60, lastHeartbeatAt: "2026-07-10T18:00:00.000Z" }, // mesmo dia do 1º
    ];
    const dates = toActivityDates(sessions);
    expect(dates).toEqual(["2026-07-10T00:00:00.000Z"]);
  });

  it("sumValidSecondsByDate soma validSeconds do mesmo dia civil", () => {
    const sessions = [
      { validSeconds: 120, lastHeartbeatAt: "2026-07-10T10:00:00.000Z" },
      { validSeconds: 60, lastHeartbeatAt: "2026-07-10T18:00:00.000Z" },
      { validSeconds: 30, lastHeartbeatAt: "2026-07-11T08:00:00.000Z" },
    ];
    const byDate = sumValidSecondsByDate(sessions);
    expect(byDate.get("2026-07-10T00:00:00.000Z")).toBe(180);
    expect(byDate.get("2026-07-11T00:00:00.000Z")).toBe(30);
  });
});

describe("study-tracking/streak — recalculateStreak (Fase 12, integração)", () => {
  beforeEach(() => {
    __resetMockStudySessionStore();
    __resetMockUserStreakStore();
    __resetMockGamificationEventStore();
    __resetMockPointTransactionStore();
    __resetMockUserAchievementStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function seedActiveDay(userId: string, dayIso: string, sessionSuffix: string): Promise<void> {
    await getRepositories().studySessions.saveSession({
      id: `sess-${sessionSuffix}`,
      userId,
      lessonId: `lesson-${sessionSuffix}`,
      source: "LESSON",
      status: "FINISHED",
      startedAt: dayIso,
      lastHeartbeatAt: dayIso,
      lastPositionSeconds: 100,
      lastClientTimestamp: 1,
      coveredIntervals: [{ startSeconds: 0, endSeconds: 100 }],
      validSeconds: 600,
      heartbeatCount: 3,
      updatedAt: dayIso,
    });
  }

  it("conta os dias corretos e respeita a quebra de sequência", async () => {
    const userId = "streak-basic";
    await seedActiveDay(userId, "2026-07-10T12:00:00.000Z", "d1");
    await seedActiveDay(userId, "2026-07-11T12:00:00.000Z", "d2");
    await seedActiveDay(userId, "2026-07-12T12:00:00.000Z", "d3");

    const view = await recalculateStreak(userId, new Date("2026-07-12T15:00:00.000Z"));
    expect(view.currentStreak).toBe(3);
    expect(view.longestStreak).toBe(3);

    // Avança "hoje" para um dia com GAP de 3 dias (sem nova atividade) — sequência quebra.
    const brokenView = await recalculateStreak(userId, new Date("2026-07-16T10:00:00.000Z"));
    expect(brokenView.currentStreak).toBe(0);
    // A maior sequência já alcançada nunca regride, mesmo após a quebra.
    expect(brokenView.longestStreak).toBe(3);
  });

  it("cruzar 7 dias emite StreakReached (STREAK_7) exatamente uma vez — idempotente", async () => {
    const userId = "streak-milestone-7";
    const days = ["06", "07", "08", "09", "10", "11", "12"];
    for (const day of days) {
      await seedActiveDay(userId, `2026-07-${day}T12:00:00.000Z`, day);
    }

    const now = new Date("2026-07-12T18:00:00.000Z");
    const first = await recalculateStreak(userId, now);
    expect(first.currentStreak).toBe(7);

    const repos = getRepositories();
    const events = await repos.gamificationEvents.listByUserId(userId);
    expect(events.filter((event) => event.type === "STREAK_7")).toHaveLength(1);
    const { points } = await repos.pointTransactions.sumByUserId(userId);
    expect(points).toBe(700); // GAMIFICATION_REWARDS.STREAK_7

    // Recalcular de novo (mesmos dados) não deve reemitir/recreditar.
    const second = await recalculateStreak(userId, now);
    expect(second.currentStreak).toBe(7);
    const eventsAfterSecond = await repos.gamificationEvents.listByUserId(userId);
    expect(eventsAfterSecond.filter((event) => event.type === "STREAK_7")).toHaveLength(1);
    const { points: pointsAfterSecond } = await repos.pointTransactions.sumByUserId(userId);
    expect(pointsAfterSecond).toBe(700); // nunca 1400
  });
});

describe("gamification/read — computeUserGamificationStats lê streak/estudo REAIS (Fase 12)", () => {
  beforeEach(() => {
    __resetMockStudySessionStore();
    __resetMockUserStreakStore();
    __resetMockGamificationEventStore();
    __resetMockPointTransactionStore();
    __resetMockUserAchievementStore();
  });

  it("streakDays/studyHours/firstWeekFullyActive refletem StudySession real após recalculateStreak", async () => {
    const userId = "gam-read-real-streak";
    const days = ["06", "07", "08", "09", "10", "11", "12"];
    for (const day of days) {
      await getRepositories().studySessions.saveSession({
        id: `gam-read-sess-${day}`,
        userId,
        lessonId: `gam-read-lesson-${day}`,
        source: "LESSON",
        status: "FINISHED",
        startedAt: `2026-07-${day}T12:00:00.000Z`,
        lastHeartbeatAt: `2026-07-${day}T12:00:00.000Z`,
        lastPositionSeconds: 100,
        lastClientTimestamp: 1,
        coveredIntervals: [{ startSeconds: 0, endSeconds: 100 }],
        validSeconds: 600, // 10 minutos/dia
        heartbeatCount: 3,
        updatedAt: `2026-07-${day}T12:00:00.000Z`,
      });
    }

    // ANTES do recálculo: sem `UserStreak` materializado ainda — conquistas leem 0 (honesto,
    // nunca um valor inventado).
    const statsBefore = await computeUserGamificationStats(userId);
    expect(statsBefore.streakDays).toBe(0);

    // `computeUserGamificationStats` já reflete o calendário de atividade real (StudySession),
    // mesmo sem depender de `recalculateStreak` ter rodado (fonte independente para
    // `firstWeekFullyActive`/`studyHours` — só `streakDays` depende do cache materializado).
    expect(statsBefore.firstWeekFullyActive).toBe(true); // 7 dias consecutivos desde o 1º dia ativo
    expect(statsBefore.studyHours).toBeCloseTo((7 * 600) / 3600, 5); // 7 * 10min em horas

    // DEPOIS do recálculo (ex.: aluno visita "Acompanhamento"): streakDays passa a refletir o
    // cache materializado real.
    await recalculateStreak(userId, new Date("2026-07-12T18:00:00.000Z"));
    const statsAfter = await computeUserGamificationStats(userId);
    expect(statsAfter.streakDays).toBe(7);
  });
});
