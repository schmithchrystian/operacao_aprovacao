import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { createDeckActionMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  createDeckActionMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/flashcards", () => ({
  createDeckAction: createDeckActionMock,
}));

const { CreateDeckDialog } = await import("@/components/flashcards/create-deck-dialog");

const subjects = [
  { id: "subject-1", name: "Direito Penal" },
  { id: "subject-2", name: "Língua Portuguesa" },
];

describe("CreateDeckDialog", () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    createDeckActionMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    onCreated.mockReset();
  });

  it("não envia o formulário quando o título está vazio", async () => {
    const user = userEvent.setup();
    render(<CreateDeckDialog subjects={subjects} onCreated={onCreated} />);

    await user.click(screen.getByRole("button", { name: /criar baralho/i }));
    await user.click(screen.getByRole("button", { name: /^salvar$/i }));

    expect(await screen.findByText("Informe um título.")).toBeTruthy();
    expect(createDeckActionMock).not.toHaveBeenCalled();
  });

  it("cria um baralho só com o título, enviando subjectId undefined quando nenhuma matéria é escolhida", async () => {
    createDeckActionMock.mockResolvedValue({
      ok: true,
      data: { id: "deck-novo", title: "Revisão final", type: "PERSONAL", subjectId: null, subjectName: null, cardCount: 0, dueCount: 0 },
    });
    const user = userEvent.setup();

    render(<CreateDeckDialog subjects={subjects} onCreated={onCreated} />);

    await user.click(screen.getByRole("button", { name: /criar baralho/i }));
    await user.type(screen.getByLabelText(/título do baralho/i), "Revisão final");
    await user.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() =>
      expect(createDeckActionMock).toHaveBeenCalledWith({ title: "Revisão final", subjectId: undefined }),
    );
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: "deck-novo" }));
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("envia o subjectId escolhido", async () => {
    createDeckActionMock.mockResolvedValue({
      ok: true,
      data: { id: "deck-novo", title: "Penal", type: "PERSONAL", subjectId: "subject-1", subjectName: "Direito Penal", cardCount: 0, dueCount: 0 },
    });
    const user = userEvent.setup();

    render(<CreateDeckDialog subjects={subjects} onCreated={onCreated} />);

    await user.click(screen.getByRole("button", { name: /criar baralho/i }));
    await user.type(screen.getByLabelText(/título do baralho/i), "Penal");
    await user.selectOptions(screen.getByLabelText(/matéria/i), "subject-1");
    await user.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() =>
      expect(createDeckActionMock).toHaveBeenCalledWith({ title: "Penal", subjectId: "subject-1" }),
    );
  });

  it("mapeia fieldErrors do servidor (ex.: title) para o campo correspondente", async () => {
    createDeckActionMock.mockResolvedValue({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", fieldErrors: { title: ["Título muito longo."] } },
    });
    const user = userEvent.setup();

    render(<CreateDeckDialog subjects={subjects} onCreated={onCreated} />);

    await user.click(screen.getByRole("button", { name: /criar baralho/i }));
    await user.type(screen.getByLabelText(/título do baralho/i), "Título qualquer");
    await user.click(screen.getByRole("button", { name: /^salvar$/i }));

    expect(await screen.findByText("Título muito longo.")).toBeTruthy();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
