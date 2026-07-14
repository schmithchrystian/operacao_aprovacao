import { describe, expect, it } from "vitest";
import type { TrackingOverviewDTO } from "@/contracts/tracking";
// `diagnosis.ts` é puro (sem I/O, sem auth) — nenhum mock de `@/server/auth` necessário aqui,
// diferente dos testes de serviço (`streak-calculation.test.ts`/`study-goals.test.ts`).
import { computeDiagnosis } from "@/server/services/study-tracking/diagnosis";

/**
 * Testes do diagnóstico de preparação — Fase 12 (CLAUDE.md — "diagnóstico de preparação").
 * `computeDiagnosis` é PURO: cobre determinismo, classificação forte/fraco e reação do risco
 * de atraso à data da prova/ritmo.
 */

function baseOverview(overrides: Partial<TrackingOverviewDTO> = {}): TrackingOverviewDTO {
  return {
    hours: { todayMinutes: 30, weekMinutes: 200, monthMinutes: 800 },
    lessonsCompleted: 10,
    questions: { totalAnswered: 50, totalCorrect: 40, accuracyPercent: 80, averageSecondsPerQuestion: 45 },
    weeklyEvolution: [],
    monthlyEvolution: [],
    subjectPerformance: [],
    topicPerformance: [],
    timeDistribution: [],
    weakContents: [],
    pendingContents: [],
    overdueReviews: [],
    consistency: { windowDays: 30, activeDays: 24, consistencyPercent: 80 },
    examProgress: { examDate: null, daysUntilExam: null, planProgressPercent: null, expectedProgressPercent: null },
    streak: { currentStreak: 5, longestStreak: 10, lastActiveDate: "2026-07-12T00:00:00.000Z", freezesAvailable: 0 },
    dailyGoal: {
      targetMinutes: null,
      targetPoints: 150,
      progressMinutes: 0,
      progressPoints: 150,
      achieved: true,
      achievedAt: "2026-07-13T00:00:00.000Z",
    },
    weeklyGoal: {
      targetMinutes: null,
      targetPoints: 500,
      progressMinutes: 0,
      progressPoints: 500,
      achieved: true,
      achievedAt: "2026-07-13T00:00:00.000Z",
    },
    ...overrides,
  };
}

describe("study-tracking/diagnosis — computeDiagnosis (determinismo e classificação)", () => {
  it("é determinístico: a mesma entrada sempre produz a mesma saída", () => {
    const overview = baseOverview({
      subjectPerformance: [{ subjectId: "s1", subjectName: "Português", total: 10, correct: 9, accuracyPercent: 90 }],
    });

    const a = computeDiagnosis(overview);
    const b = computeDiagnosis(overview);
    expect(a).toEqual(b);
  });

  it("classifica matéria com >=80% de acerto (amostra suficiente) como ponto forte", () => {
    const overview = baseOverview({
      subjectPerformance: [{ subjectId: "s1", subjectName: "Português", total: 10, correct: 9, accuracyPercent: 90 }],
    });

    const diagnosis = computeDiagnosis(overview);
    expect(diagnosis.strengths.some((entry) => entry.includes("Português"))).toBe(true);
    expect(diagnosis.weaknesses.some((entry) => entry.includes("Português"))).toBe(false);
  });

  it("classifica matéria com <60% de acerto (amostra suficiente) como ponto fraco e prioridade", () => {
    const overview = baseOverview({
      subjectPerformance: [{ subjectId: "s2", subjectName: "Matemática", total: 5, correct: 1, accuracyPercent: 20 }],
    });

    const diagnosis = computeDiagnosis(overview);
    expect(diagnosis.weaknesses.some((entry) => entry.includes("Matemática"))).toBe(true);
    expect(diagnosis.priorities.some((entry) => entry.includes("Matemática"))).toBe(true);
    expect(diagnosis.strengths.some((entry) => entry.includes("Matemática"))).toBe(false);
  });

  it("ignora amostra estatisticamente insuficiente (< 3 respostas) para classificar forte/fraco", () => {
    const overview = baseOverview({
      subjectPerformance: [
        { subjectId: "s3", subjectName: "Química", total: 1, correct: 0, accuracyPercent: 0 },
        { subjectId: "s4", subjectName: "Física", total: 1, correct: 1, accuracyPercent: 100 },
      ],
    });

    const diagnosis = computeDiagnosis(overview);
    expect(diagnosis.weaknesses.some((entry) => entry.includes("Química"))).toBe(false);
    expect(diagnosis.strengths.some((entry) => entry.includes("Física"))).toBe(false);
  });

  it("revisões atrasadas aparecem como ponto fraco e prioridade, ordenadas pelas mais atrasadas", () => {
    const overview = baseOverview({
      overdueReviews: [
        { itemId: "i1", title: "Revisar crase", subjectName: "Português", targetDate: "2026-07-01T00:00:00.000Z", daysLate: 2 },
        { itemId: "i2", title: "Revisar frações", subjectName: "Matemática", targetDate: "2026-06-20T00:00:00.000Z", daysLate: 10 },
      ],
    });

    const diagnosis = computeDiagnosis(overview);
    expect(diagnosis.weaknesses.some((entry) => entry.includes("2 revisão"))).toBe(true);
    expect(diagnosis.priorities[0]).toContain("frações"); // a mais atrasada vem primeiro
  });
});

describe("study-tracking/diagnosis — risco de atraso reage à data da prova/ritmo", () => {
  it("sem data de prova definida no plano: risco LOW com motivo explícito (não 'está tudo bem')", () => {
    const diagnosis = computeDiagnosis(baseOverview());
    expect(diagnosis.delayRisk).toBe("LOW");
    expect(diagnosis.delayRiskReason.toLowerCase()).toContain("prova");
  });

  it("prova já passou (daysUntilExam negativo): risco HIGH", () => {
    const overview = baseOverview({
      examProgress: {
        examDate: "2026-07-01T00:00:00.000Z",
        daysUntilExam: -1,
        planProgressPercent: 90,
        expectedProgressPercent: 100,
      },
    });
    expect(computeDiagnosis(overview).delayRisk).toBe("HIGH");
  });

  it("gap grande entre progresso real e esperado (>=15 pontos): risco HIGH", () => {
    const overview = baseOverview({
      examProgress: {
        examDate: "2026-12-01T00:00:00.000Z",
        daysUntilExam: 90,
        planProgressPercent: 20,
        expectedProgressPercent: 50, // gap = -30
      },
    });
    expect(computeDiagnosis(overview).delayRisk).toBe("HIGH");
  });

  it("prova em <=7 dias com qualquer atraso: risco HIGH mesmo com gap pequeno", () => {
    const overview = baseOverview({
      examProgress: {
        examDate: "2026-07-20T00:00:00.000Z",
        daysUntilExam: 5,
        planProgressPercent: 40,
        expectedProgressPercent: 45, // gap = -5 (não cruzaria o limiar ALTO isoladamente)
      },
    });
    expect(computeDiagnosis(overview).delayRisk).toBe("HIGH");
  });

  it("gap moderado, prova distante: risco MEDIUM", () => {
    const overview = baseOverview({
      examProgress: {
        examDate: "2026-12-01T00:00:00.000Z",
        daysUntilExam: 90,
        planProgressPercent: 44,
        expectedProgressPercent: 50, // gap = -6
      },
    });
    expect(computeDiagnosis(overview).delayRisk).toBe("MEDIUM");
  });

  it("consistência baixa isoladamente eleva o risco para MEDIUM mesmo em dia com o plano", () => {
    const overview = baseOverview({
      consistency: { windowDays: 30, activeDays: 6, consistencyPercent: 20 },
      examProgress: {
        examDate: "2026-12-01T00:00:00.000Z",
        daysUntilExam: 90,
        planProgressPercent: 50,
        expectedProgressPercent: 50, // gap = 0 (em dia)
      },
    });
    expect(computeDiagnosis(overview).delayRisk).toBe("MEDIUM");
  });

  it("progresso em dia (ou acima) e prova distante: risco LOW", () => {
    const overview = baseOverview({
      examProgress: {
        examDate: "2026-12-01T00:00:00.000Z",
        daysUntilExam: 90,
        planProgressPercent: 60,
        expectedProgressPercent: 50, // à frente do esperado
      },
    });
    expect(computeDiagnosis(overview).delayRisk).toBe("LOW");
  });
});
