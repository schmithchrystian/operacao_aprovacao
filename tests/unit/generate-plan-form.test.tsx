import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StudyPlanDTO } from "@/contracts/study-plan";

const { generatePlanActionMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  generatePlanActionMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/study-plan", () => ({
  generatePlanAction: generatePlanActionMock,
}));

const { GeneratePlanForm } = await import("@/components/study-plan/generate-plan-form");

const subjects = [
  { id: "subject-1", name: "Direito Constitucional" },
  { id: "subject-2", name: "Língua Portuguesa" },
];

const generatedPlan = { id: "plan-1", title: "Plano de estudos" } as unknown as StudyPlanDTO;

describe("GeneratePlanForm", () => {
  const onGenerated = vi.fn();

  beforeEach(() => {
    generatePlanActionMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    onGenerated.mockReset();
  });

  it("exige ao menos uma matéria selecionada e não gera o plano sem isso", async () => {
    const user = userEvent.setup();
    render(<GeneratePlanForm subjects={subjects} onGenerated={onGenerated} />);

    fireEvent.change(screen.getByLabelText(/data da prova/i), { target: { value: "2026-09-14" } });
    await user.click(screen.getByRole("button", { name: /gerar plano de estudos/i }));

    expect(await screen.findByText(/selecione ao menos uma matéria/i)).toBeTruthy();
    expect(generatePlanActionMock).not.toHaveBeenCalled();
  });

  it("gera o plano com os pesos das matérias selecionadas e as preferências padrão", async () => {
    generatePlanActionMock.mockResolvedValue({ ok: true, data: generatedPlan });
    const user = userEvent.setup();
    render(<GeneratePlanForm subjects={subjects} onGenerated={onGenerated} />);

    fireEvent.change(screen.getByLabelText(/data da prova/i), { target: { value: "2026-09-14" } });
    await user.click(screen.getByRole("checkbox", { name: /direito constitucional/i }));
    await user.click(screen.getByRole("button", { name: /gerar plano de estudos/i }));

    await waitFor(() => expect(generatePlanActionMock).toHaveBeenCalledTimes(1));
    expect(generatePlanActionMock).toHaveBeenCalledWith({
      title: undefined,
      examDate: "2026-09-14T00:00:00.000Z",
      daysPerWeek: 6,
      hoursPerDay: 2,
      subjectWeights: [{ subjectId: "subject-1", weight: 1 }],
      includeReviews: true,
      includeMockExams: true,
    });
    expect(onGenerated).toHaveBeenCalledWith(generatedPlan);
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("desmarcar revisões/simulados envia false e respeita o peso customizado", async () => {
    generatePlanActionMock.mockResolvedValue({ ok: true, data: generatedPlan });
    const user = userEvent.setup();
    render(<GeneratePlanForm subjects={subjects} onGenerated={onGenerated} />);

    fireEvent.change(screen.getByLabelText(/data da prova/i), { target: { value: "2026-09-14" } });
    await user.click(screen.getByRole("checkbox", { name: /língua portuguesa/i }));
    // Ambas as linhas têm um rótulo "Peso" idêntico (um por matéria) — índice 1 = "Língua
    // Portuguesa" (segunda matéria na lista `subjects`, mesma ordem em que as linhas renderizam).
    const weightInput = screen.getAllByLabelText(/^peso$/i)[1]!;
    await user.clear(weightInput);
    await user.type(weightInput, "3");
    await user.click(screen.getByRole("checkbox", { name: /incluir sessões de revisão/i }));
    await user.click(screen.getByRole("checkbox", { name: /incluir simulados semanais/i }));
    await user.click(screen.getByRole("button", { name: /gerar plano de estudos/i }));

    await waitFor(() =>
      expect(generatePlanActionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectWeights: [{ subjectId: "subject-2", weight: 3 }],
          includeReviews: false,
          includeMockExams: false,
        }),
      ),
    );
  });

  it("mapeia fieldErrors do servidor (ex.: data da prova rejeitada) para o campo correspondente", async () => {
    generatePlanActionMock.mockResolvedValue({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados inválidos.",
        fieldErrors: { examDate: ["A data da prova deve ser depois da data de início."] },
      },
    });
    const user = userEvent.setup();
    render(<GeneratePlanForm subjects={subjects} onGenerated={onGenerated} />);

    fireEvent.change(screen.getByLabelText(/data da prova/i), { target: { value: "2020-01-01" } });
    await user.click(screen.getByRole("checkbox", { name: /direito constitucional/i }));
    await user.click(screen.getByRole("button", { name: /gerar plano de estudos/i }));

    expect(
      await screen.findByText("A data da prova deve ser depois da data de início."),
    ).toBeTruthy();
    expect(onGenerated).not.toHaveBeenCalled();
  });
});
