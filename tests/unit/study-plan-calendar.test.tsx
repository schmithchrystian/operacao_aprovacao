import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StudyPlanDayDTO, StudyPlanDTO, StudyPlanItemDTO } from "@/contracts/study-plan";

const { getPlanActionMock, reorderPlanItemsActionMock, updatePlanItemActionMock } = vi.hoisted(
  () => ({
    getPlanActionMock: vi.fn(),
    reorderPlanItemsActionMock: vi.fn(),
    updatePlanItemActionMock: vi.fn(),
  }),
);

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/server/actions/study-plan", () => ({
  getPlanAction: getPlanActionMock,
  reorderPlanItemsAction: reorderPlanItemsActionMock,
  updatePlanItemAction: updatePlanItemActionMock,
}));

const { StudyPlanCalendar } = await import("@/components/study-plan/study-plan-calendar");

const MONDAY = "2026-07-06T00:00:00.000Z";
const TUESDAY = "2026-07-07T00:00:00.000Z";

function makeItem(
  overrides: Partial<StudyPlanItemDTO> &
    Pick<StudyPlanItemDTO, "id" | "title" | "targetDate" | "order">,
): StudyPlanItemDTO {
  return {
    kind: "STUDY",
    subjectId: "subject-1",
    subjectName: "Direito Constitucional",
    topicId: null,
    topicName: null,
    lessonId: null,
    lessonTitle: null,
    estimatedMinutes: 60,
    status: "PENDING",
    completedAt: null,
    ...overrides,
  };
}

function buildPlan(): StudyPlanDTO {
  const item1 = makeItem({
    id: "item-1",
    title: "Estudar — Direito Constitucional",
    targetDate: MONDAY,
    order: 0,
  });
  const item2 = makeItem({
    id: "item-2",
    title: "Revisão — Direito Constitucional",
    kind: "REVIEW",
    targetDate: MONDAY,
    order: 1,
    estimatedMinutes: 30,
  });
  const item3 = makeItem({
    id: "item-3",
    title: "Estudar — Língua Portuguesa",
    targetDate: TUESDAY,
    order: 2,
    subjectName: "Língua Portuguesa",
  });

  const dayMonday: StudyPlanDayDTO = { date: MONDAY, items: [item1, item2], totalMinutes: 90 };
  const dayTuesday: StudyPlanDayDTO = { date: TUESDAY, items: [item3], totalMinutes: 60 };

  return {
    id: "plan-1",
    title: "Reta final",
    status: "ACTIVE",
    startDate: MONDAY,
    examDate: "2026-09-14T00:00:00.000Z",
    subjectWeights: [{ subjectId: "subject-1", subjectName: "Direito Constitucional", weight: 90 }],
    items: [item1, item2, item3],
    weeklyCalendar: [{ weekStart: MONDAY, days: [dayMonday, dayTuesday] }],
    monthlyCalendar: [{ month: "2026-07", days: [dayMonday, dayTuesday] }],
    progress: {
      totalItems: 3,
      doneItems: 0,
      progressPercent: 0,
      overdueItems: 0,
      daysUntilExam: 60,
    },
  };
}

describe("StudyPlanCalendar", () => {
  const onPlanUpdated = vi.fn();
  const onRequestRegenerate = vi.fn();

  beforeEach(() => {
    getPlanActionMock.mockReset();
    reorderPlanItemsActionMock.mockReset();
    updatePlanItemActionMock.mockReset();
    onPlanUpdated.mockReset();
    onRequestRegenerate.mockReset();
  });

  it("mostra cabeçalho, contagem regressiva e os itens da semana do plano", () => {
    render(
      <StudyPlanCalendar
        plan={buildPlan()}
        onPlanUpdated={onPlanUpdated}
        onRequestRegenerate={onRequestRegenerate}
      />,
    );

    expect(screen.getByText("Reta final")).toBeTruthy();
    expect(screen.getByText(/faltam 60 dia\(s\)/i)).toBeTruthy();
    expect(screen.getByText("Estudar — Direito Constitucional")).toBeTruthy();
    expect(screen.getByText("Revisão — Direito Constitucional")).toBeTruthy();
    expect(screen.getByText("Estudar — Língua Portuguesa")).toBeTruthy();
  });

  it("marca um item como concluído e repassa o plano recarregado ao pai", async () => {
    updatePlanItemActionMock.mockResolvedValue({
      ok: true,
      data: { id: "item-1", status: "DONE" },
    });
    const refreshedPlan = buildPlan();
    getPlanActionMock.mockResolvedValue({ ok: true, data: refreshedPlan });
    const user = userEvent.setup();

    render(
      <StudyPlanCalendar
        plan={buildPlan()}
        onPlanUpdated={onPlanUpdated}
        onRequestRegenerate={onRequestRegenerate}
      />,
    );

    const row = screen.getByText("Estudar — Direito Constitucional").closest("li")!;
    await user.click(within(row).getByRole("checkbox"));

    await waitFor(() =>
      expect(updatePlanItemActionMock).toHaveBeenCalledWith({
        planId: "plan-1",
        itemId: "item-1",
        status: "DONE",
      }),
    );
    await waitFor(() => expect(onPlanUpdated).toHaveBeenCalledWith(refreshedPlan));
  });

  it("move um item para baixo dentro do dia e chama reorderPlanItemsAction com a ordem correta", async () => {
    reorderPlanItemsActionMock.mockResolvedValue({ ok: true, data: [] });
    getPlanActionMock.mockResolvedValue({ ok: true, data: buildPlan() });
    const user = userEvent.setup();

    render(
      <StudyPlanCalendar
        plan={buildPlan()}
        onPlanUpdated={onPlanUpdated}
        onRequestRegenerate={onRequestRegenerate}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /mover "estudar — direito constitucional" para baixo/i }),
    );

    await waitFor(() =>
      expect(reorderPlanItemsActionMock).toHaveBeenCalledWith({
        planId: "plan-1",
        itemIds: ["item-2", "item-1", "item-3"],
      }),
    );
    await waitFor(() => expect(onPlanUpdated).toHaveBeenCalled());
  });

  it("alterna para a visão mensal e volta para a semana ao clicar num dia", async () => {
    const user = userEvent.setup();
    render(
      <StudyPlanCalendar
        plan={buildPlan()}
        onPlanUpdated={onPlanUpdated}
        onRequestRegenerate={onRequestRegenerate}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /mês/i }));
    expect(screen.getByRole("tab", { name: /mês/i }).getAttribute("aria-selected")).toBe("true");

    await user.click(screen.getByRole("button", { name: /^07/ }));

    expect(screen.getByRole("tab", { name: /semana/i }).getAttribute("aria-selected")).toBe("true");
  });

  it("mostra estado vazio quando o plano não tem itens e permite gerar um novo", async () => {
    const emptyPlan: StudyPlanDTO = {
      ...buildPlan(),
      items: [],
      weeklyCalendar: [],
      monthlyCalendar: [],
      progress: {
        totalItems: 0,
        doneItems: 0,
        progressPercent: 0,
        overdueItems: 0,
        daysUntilExam: 60,
      },
    };
    const user = userEvent.setup();
    render(
      <StudyPlanCalendar
        plan={emptyPlan}
        onPlanUpdated={onPlanUpdated}
        onRequestRegenerate={onRequestRegenerate}
      />,
    );

    expect(screen.getByText(/nenhum item no plano ainda/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /gerar plano/i }));
    expect(onRequestRegenerate).toHaveBeenCalled();
  });
});
