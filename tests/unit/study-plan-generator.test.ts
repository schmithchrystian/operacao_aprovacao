import { describe, expect, it } from "vitest";
import { STUDY_PLAN } from "@/config/business";
import { generateStudyPlanItems, type PlanGeneratorInput } from "@/server/services/study-plan/plan-generator";

/**
 * Testes do núcleo PURO da heurística de "Plano de estudos" (Fase 11 — CLAUDE.md §31 item 13).
 * Sem I/O — `startDate`/`examDate` são sempre entrada explícita (nunca `Date.now()`).
 */
describe("plan-generator/generateStudyPlanItems", () => {
  it("matéria de maior peso recebe mais DIAS e mais MINUTOS totais de estudo", () => {
    const items = generateStudyPlanItems({
      startDate: "2026-07-06T00:00:00.000Z",
      examDate: "2026-07-27T00:00:00.000Z", // 3 semanas
      daysPerWeek: 6,
      hoursPerDay: 1,
      subjects: [
        { subjectId: "s-high", weight: 4 },
        { subjectId: "s-low", weight: 1 },
      ],
      includeReviews: true,
      includeMockExams: true,
    });

    const studyItems = items.filter((item) => item.kind === "STUDY");
    const highItems = studyItems.filter((item) => item.subjectId === "s-high");
    const lowItems = studyItems.filter((item) => item.subjectId === "s-low");

    expect(highItems.length).toBeGreaterThan(lowItems.length);
    const highMinutes = highItems.reduce((sum, item) => sum + item.estimatedMinutes, 0);
    const lowMinutes = lowItems.reduce((sum, item) => sum + item.estimatedMinutes, 0);
    expect(highMinutes).toBeGreaterThan(lowMinutes);
  });

  it("respeita a data da prova: examDate igual ou anterior a startDate não gera nenhum item", () => {
    const base: Omit<PlanGeneratorInput, "startDate" | "examDate"> = {
      daysPerWeek: 6,
      hoursPerDay: 2,
      subjects: [{ subjectId: "s1", weight: 1 }],
      includeReviews: true,
      includeMockExams: true,
    };

    expect(
      generateStudyPlanItems({ ...base, startDate: "2026-07-06T00:00:00.000Z", examDate: "2026-07-06T00:00:00.000Z" }),
    ).toEqual([]);
    expect(
      generateStudyPlanItems({ ...base, startDate: "2026-07-06T00:00:00.000Z", examDate: "2026-07-01T00:00:00.000Z" }),
    ).toEqual([]);
  });

  it("sem matérias informadas não gera nenhum item", () => {
    const items = generateStudyPlanItems({
      startDate: "2026-07-06T00:00:00.000Z",
      examDate: "2026-07-20T00:00:00.000Z",
      daysPerWeek: 6,
      hoursPerDay: 2,
      subjects: [],
      includeReviews: true,
      includeMockExams: true,
    });
    expect(items).toEqual([]);
  });

  it("includeReviews=false não gera nenhum item REVIEW; includeMockExams=false não gera nenhum item MOCK_EXAM", () => {
    const items = generateStudyPlanItems({
      startDate: "2026-07-06T00:00:00.000Z",
      examDate: "2026-07-27T00:00:00.000Z",
      daysPerWeek: 5,
      hoursPerDay: 1,
      subjects: [{ subjectId: "s1", weight: 1 }],
      includeReviews: false,
      includeMockExams: false,
    });

    expect(items.some((item) => item.kind === "REVIEW")).toBe(false);
    expect(items.some((item) => item.kind === "MOCK_EXAM")).toBe(false);
  });

  it("quando ligados, revisões usam a duração default configurada e simulados também", () => {
    const items = generateStudyPlanItems({
      startDate: "2026-07-06T00:00:00.000Z",
      examDate: "2026-07-27T00:00:00.000Z",
      daysPerWeek: 5,
      hoursPerDay: 1,
      subjects: [{ subjectId: "s1", weight: 1 }],
      includeReviews: true,
      includeMockExams: true,
    });

    const reviews = items.filter((item) => item.kind === "REVIEW");
    const mockExams = items.filter((item) => item.kind === "MOCK_EXAM");
    expect(reviews.length).toBeGreaterThan(0);
    expect(mockExams.length).toBeGreaterThan(0);
    expect(reviews.every((item) => item.estimatedMinutes === STUDY_PLAN.defaultReviewMinutes)).toBe(true);
    expect(mockExams.every((item) => item.estimatedMinutes === STUDY_PLAN.defaultWeeklyMockExamMinutes)).toBe(true);
    // Simulado não amarra a nenhuma matéria específica.
    expect(mockExams.every((item) => item.subjectId === null)).toBe(true);
  });

  it("com daysPerWeek=7 (sem folga natural), o simulado semanal ainda aparece no 7º dia, adicional ao estudo", () => {
    const items = generateStudyPlanItems({
      startDate: "2026-07-06T00:00:00.000Z",
      examDate: "2026-07-14T00:00:00.000Z", // 8 dias corridos
      daysPerWeek: 7,
      hoursPerDay: 1,
      subjects: [{ subjectId: "s1", weight: 1 }],
      includeReviews: true,
      includeMockExams: true,
    });

    const seventhDay = "2026-07-12T00:00:00.000Z"; // startDate + 6 dias (offset 6 = 7º dia do ciclo)
    const itemsOnSeventhDay = items.filter((item) => item.date === seventhDay);
    expect(itemsOnSeventhDay.some((item) => item.kind === "STUDY")).toBe(true);
    expect(itemsOnSeventhDay.some((item) => item.kind === "MOCK_EXAM")).toBe(true);
  });

  it("dias de estudo com hoursPerDay >= limiar dividem o dia em 2 matérias, somando o total de minutos do dia", () => {
    const items = generateStudyPlanItems({
      startDate: "2026-07-06T00:00:00.000Z",
      examDate: "2026-07-13T00:00:00.000Z",
      daysPerWeek: 7,
      hoursPerDay: 3, // >= STUDY_PLAN.minHoursForTwoSubjectsPerDay (2) -> 2 blocos/dia
      subjects: [
        { subjectId: "s1", weight: 1 },
        { subjectId: "s2", weight: 1 },
      ],
      includeReviews: false,
      includeMockExams: false,
    });

    const firstDay = "2026-07-06T00:00:00.000Z";
    const studyItemsFirstDay = items.filter((item) => item.date === firstDay && item.kind === "STUDY");
    expect(studyItemsFirstDay).toHaveLength(2);
    const totalMinutes = studyItemsFirstDay.reduce((sum, item) => sum + item.estimatedMinutes, 0);
    expect(totalMinutes).toBe(180); // 3h * 60min
  });

  it("dias de estudo com hoursPerDay abaixo do limiar usam um único bloco (dia inteiro p/ 1 matéria)", () => {
    const items = generateStudyPlanItems({
      startDate: "2026-07-06T00:00:00.000Z",
      examDate: "2026-07-13T00:00:00.000Z",
      daysPerWeek: 7,
      hoursPerDay: 1.5,
      subjects: [
        { subjectId: "s1", weight: 1 },
        { subjectId: "s2", weight: 1 },
      ],
      includeReviews: false,
      includeMockExams: false,
    });

    const firstDay = "2026-07-06T00:00:00.000Z";
    const studyItemsFirstDay = items.filter((item) => item.date === firstDay && item.kind === "STUDY");
    expect(studyItemsFirstDay).toHaveLength(1);
    expect(studyItemsFirstDay[0]!.estimatedMinutes).toBe(90); // 1.5h * 60min
  });

  it("itens ficam ordenados cronologicamente e `order` é sequencial a partir de 0", () => {
    const items = generateStudyPlanItems({
      startDate: "2026-07-06T00:00:00.000Z",
      examDate: "2026-07-20T00:00:00.000Z",
      daysPerWeek: 5,
      hoursPerDay: 2,
      subjects: [
        { subjectId: "a", weight: 1 },
        { subjectId: "b", weight: 1 },
      ],
      includeReviews: true,
      includeMockExams: true,
    });

    const dates = items.map((item) => item.date);
    expect(dates).toEqual([...dates].sort());
    expect(items.map((item) => item.order)).toEqual(items.map((_, index) => index));
  });

  it("todas as datas geradas estão dentro do intervalo [startDate, examDate)", () => {
    const startDate = "2026-07-06T00:00:00.000Z";
    const examDate = "2026-07-20T00:00:00.000Z";
    const items = generateStudyPlanItems({
      startDate,
      examDate,
      daysPerWeek: 6,
      hoursPerDay: 2,
      subjects: [{ subjectId: "a", weight: 1 }],
      includeReviews: true,
      includeMockExams: true,
    });

    for (const item of items) {
      expect(item.date >= startDate).toBe(true);
      expect(item.date < examDate).toBe(true);
    }
  });

  it("é determinística — mesma entrada sempre produz a mesma lista de itens", () => {
    const input: PlanGeneratorInput = {
      startDate: "2026-07-06T00:00:00.000Z",
      examDate: "2026-08-03T00:00:00.000Z",
      daysPerWeek: 5,
      hoursPerDay: 2.5,
      subjects: [
        { subjectId: "a", weight: 3 },
        { subjectId: "b", weight: 2 },
        { subjectId: "c", weight: 1 },
      ],
      includeReviews: true,
      includeMockExams: true,
    };

    expect(generateStudyPlanItems(input)).toEqual(generateStudyPlanItems(input));
  });
});
