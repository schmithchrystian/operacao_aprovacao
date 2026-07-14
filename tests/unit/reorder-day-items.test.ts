import { describe, expect, it } from "vitest";
import type { StudyPlanDayDTO, StudyPlanItemDTO } from "@/contracts/study-plan";
import { reorderDayItems } from "@/components/study-plan/reorder-day-items";

function makeItem(id: string, targetDate: string, order: number): StudyPlanItemDTO {
  return {
    id,
    kind: "STUDY",
    subjectId: null,
    subjectName: null,
    topicId: null,
    topicName: null,
    lessonId: null,
    lessonTitle: null,
    title: `Item ${id}`,
    targetDate,
    estimatedMinutes: 60,
    order,
    status: "PENDING",
    completedAt: null,
  };
}

const DAY_1 = "2026-07-06T00:00:00.000Z";
const DAY_2 = "2026-07-07T00:00:00.000Z";

describe("reorderDayItems", () => {
  it("reordena os ids dentro do dia preservando a posição relativa dos demais dias", () => {
    // Plano intercalado: dia 1 (a,b,c), dia 2 (x,y) intercalados na sequência global de `order`.
    const allItems = [
      makeItem("a", DAY_1, 0),
      makeItem("x", DAY_2, 1),
      makeItem("b", DAY_1, 2),
      makeItem("y", DAY_2, 3),
      makeItem("c", DAY_1, 4),
    ];
    const day: StudyPlanDayDTO = {
      date: DAY_1,
      items: [allItems[0]!, allItems[2]!, allItems[4]!], // a, b, c (nesta ordem relativa)
      totalMinutes: 180,
    };

    // Move "a" (índice 0 dentro do dia) para depois de "b" (índice 1) -> ordem final do dia: b, a, c
    const result = reorderDayItems(allItems, day, 0, 1);

    expect(result).toEqual(["b", "x", "a", "y", "c"]);
  });

  it("move o último item do dia para o início (mesmo padrão de drag-and-drop)", () => {
    const allItems = [makeItem("a", DAY_1, 0), makeItem("b", DAY_1, 1), makeItem("c", DAY_1, 2)];
    const day: StudyPlanDayDTO = { date: DAY_1, items: allItems, totalMinutes: 180 };

    const result = reorderDayItems(allItems, day, 2, 0);

    expect(result).toEqual(["c", "a", "b"]);
  });

  it("retorna a ordem atual sem alteração quando fromIndex === toIndex", () => {
    const allItems = [makeItem("a", DAY_1, 0), makeItem("b", DAY_1, 1)];
    const day: StudyPlanDayDTO = { date: DAY_1, items: allItems, totalMinutes: 120 };

    const result = reorderDayItems(allItems, day, 1, 1);

    expect(result).toEqual(["a", "b"]);
  });

  it("retorna a ordem atual sem alteração para índices fora do intervalo do dia", () => {
    const allItems = [makeItem("a", DAY_1, 0), makeItem("b", DAY_1, 1)];
    const day: StudyPlanDayDTO = { date: DAY_1, items: allItems, totalMinutes: 120 };

    expect(reorderDayItems(allItems, day, 0, -1)).toEqual(["a", "b"]);
    expect(reorderDayItems(allItems, day, 0, 5)).toEqual(["a", "b"]);
  });

  it("não afeta a ordem de itens de outros dias intercalados na sequência global", () => {
    const allItems = [
      makeItem("mon-1", DAY_1, 0),
      makeItem("tue-1", DAY_2, 1),
      makeItem("mon-2", DAY_1, 2),
      makeItem("tue-2", DAY_2, 3),
    ];
    const tuesday: StudyPlanDayDTO = {
      date: DAY_2,
      items: [allItems[1]!, allItems[3]!],
      totalMinutes: 120,
    };

    const result = reorderDayItems(allItems, tuesday, 0, 1);

    // "mon-1"/"mon-2" continuam nas mesmas posições globais; só tue-1/tue-2 trocam entre si.
    expect(result).toEqual(["mon-1", "tue-2", "mon-2", "tue-1"]);
  });
});
