import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ErrorNotebookItemDTO } from "@/contracts/simulations";

const { toggleFavoriteActionMock } = vi.hoisted(() => ({
  toggleFavoriteActionMock: vi.fn(),
}));

vi.mock("@/server/actions/simulations", () => ({
  toggleFavoriteAction: toggleFavoriteActionMock,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

const { ErrorNotebookList } = await import("@/components/simulations/error-notebook-list");

function makeItem(overrides: Partial<ErrorNotebookItemDTO>): ErrorNotebookItemDTO {
  return {
    questionId: "q1",
    statement: "Questão de teste",
    subjectName: "Direito Penal",
    topicName: null,
    board: null,
    difficulty: "EASY",
    explanation: null,
    wrongCount: 1,
    lastAnsweredAt: "2026-07-01T00:00:00.000Z",
    isFavorite: false,
    ...overrides,
  };
}

describe("ErrorNotebookList", () => {
  beforeEach(() => {
    toggleFavoriteActionMock.mockReset();
  });

  it("lista todas as questões por padrão", () => {
    const items = [
      makeItem({ questionId: "q1", subjectName: "Direito Penal", statement: "Questão de penal" }),
      makeItem({ questionId: "q2", subjectName: "Matemática", statement: "Questão de matemática" }),
    ];
    render(<ErrorNotebookList items={items} />);

    expect(screen.getByText("Questão de penal")).toBeTruthy();
    expect(screen.getByText("Questão de matemática")).toBeTruthy();
  });

  it("filtra por matéria selecionada", async () => {
    const items = [
      makeItem({ questionId: "q1", subjectName: "Direito Penal", statement: "Questão de penal" }),
      makeItem({ questionId: "q2", subjectName: "Matemática", statement: "Questão de matemática" }),
    ];
    const user = userEvent.setup();
    render(<ErrorNotebookList items={items} />);

    await user.selectOptions(screen.getByLabelText(/filtrar por matéria/i), "Matemática");

    expect(screen.queryByText("Questão de penal")).toBeNull();
    expect(screen.getByText("Questão de matemática")).toBeTruthy();
  });

  it("não mostra o filtro quando há uma única matéria", () => {
    render(<ErrorNotebookList items={[makeItem({})]} />);
    expect(screen.queryByLabelText(/filtrar por matéria/i)).toBeNull();
  });

  it("exibe a explicação só ao expandir (não some a questão errada por trás de um recorte)", () => {
    render(<ErrorNotebookList items={[makeItem({ explanation: "Explicação detalhada aqui." })]} />);
    expect(screen.getByText(/ver explicação/i)).toBeTruthy();
  });
});
