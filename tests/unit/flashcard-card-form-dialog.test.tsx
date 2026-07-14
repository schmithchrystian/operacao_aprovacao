import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DeckDTO } from "@/contracts/flashcards";

const { createCardActionMock, listTopicOptionsActionMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  createCardActionMock: vi.fn(),
  listTopicOptionsActionMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/flashcards", () => ({
  createCardAction: createCardActionMock,
}));

vi.mock("@/server/actions/simulations", () => ({
  listTopicOptionsAction: listTopicOptionsActionMock,
}));

const { CardFormDialog } = await import("@/components/flashcards/card-form-dialog");

const decks: DeckDTO[] = [
  { id: "deck-1", title: "Meu baralho", type: "PERSONAL", subjectId: null, subjectName: null, cardCount: 2, dueCount: 0 },
];
const subjects = [
  { id: "subject-1", name: "Direito Penal" },
  { id: "subject-2", name: "Língua Portuguesa" },
];

describe("CardFormDialog (flashcards)", () => {
  const onOpenChange = vi.fn();
  const onCreated = vi.fn();

  beforeEach(() => {
    createCardActionMock.mockReset();
    listTopicOptionsActionMock.mockReset();
    listTopicOptionsActionMock.mockResolvedValue({ ok: true, data: [] });
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    onOpenChange.mockReset();
    onCreated.mockReset();
  });

  it("exige pergunta, resposta e baralho antes de enviar", async () => {
    const user = userEvent.setup();
    render(<CardFormDialog open onOpenChange={onOpenChange} decks={decks} subjects={subjects} onCreated={onCreated} />);

    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Selecione um baralho.")).toBeTruthy();
    expect(screen.getByText("Informe a pergunta.")).toBeTruthy();
    expect(screen.getByText("Informe a resposta.")).toBeTruthy();
    expect(createCardActionMock).not.toHaveBeenCalled();
  });

  it("cria um cartão com os campos obrigatórios, usando os padrões de dificuldade/tags", async () => {
    createCardActionMock.mockResolvedValue({ ok: true, data: { id: "card-novo" } });
    const user = userEvent.setup();

    render(<CardFormDialog open onOpenChange={onOpenChange} decks={decks} subjects={subjects} onCreated={onCreated} />);

    await user.selectOptions(screen.getByLabelText(/^baralho$/i), "deck-1");
    await user.type(screen.getByLabelText(/^pergunta$/i), "O que é habeas corpus?");
    await user.type(screen.getByLabelText(/^resposta$/i), "Remédio constitucional contra prisão ilegal.");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(createCardActionMock).toHaveBeenCalledTimes(1));
    expect(createCardActionMock).toHaveBeenCalledWith({
      deckId: "deck-1",
      question: "O que é habeas corpus?",
      answer: "Remédio constitucional contra prisão ilegal.",
      subjectId: undefined,
      topicId: undefined,
      difficulty: "MEDIUM",
      tags: [],
    });
    expect(onCreated).toHaveBeenCalledWith({ id: "card-novo" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("parseia tags separadas por vírgula, removendo vazios e duplicatas", async () => {
    createCardActionMock.mockResolvedValue({ ok: true, data: { id: "card-novo" } });
    const user = userEvent.setup();

    render(<CardFormDialog open onOpenChange={onOpenChange} decks={decks} subjects={subjects} onCreated={onCreated} />);

    await user.selectOptions(screen.getByLabelText(/^baralho$/i), "deck-1");
    await user.type(screen.getByLabelText(/^pergunta$/i), "Pergunta");
    await user.type(screen.getByLabelText(/^resposta$/i), "Resposta");
    await user.type(screen.getByLabelText(/tags/i), " penal ,, penal ,processual ,");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(createCardActionMock).toHaveBeenCalledWith(expect.objectContaining({ tags: ["penal", "processual"] })),
    );
  });

  it("busca assuntos ao trocar a matéria e limpa o assunto selecionado", async () => {
    listTopicOptionsActionMock.mockResolvedValue({
      ok: true,
      data: [{ id: "topic-1", subjectId: "subject-1", name: "Prescrição" }],
    });
    const user = userEvent.setup();

    render(<CardFormDialog open onOpenChange={onOpenChange} decks={decks} subjects={subjects} onCreated={onCreated} />);

    await user.selectOptions(screen.getByLabelText(/^matéria/i), "subject-1");

    await waitFor(() => expect(listTopicOptionsActionMock).toHaveBeenCalledWith({ subjectId: "subject-1" }));
    expect(await screen.findByRole("option", { name: "Prescrição" })).toBeTruthy();
  });

  it("altera a dificuldade enviada quando o aluno escolhe outra opção", async () => {
    createCardActionMock.mockResolvedValue({ ok: true, data: { id: "card-novo" } });
    const user = userEvent.setup();

    render(<CardFormDialog open onOpenChange={onOpenChange} decks={decks} subjects={subjects} onCreated={onCreated} />);

    await user.selectOptions(screen.getByLabelText(/^baralho$/i), "deck-1");
    await user.type(screen.getByLabelText(/^pergunta$/i), "Pergunta");
    await user.type(screen.getByLabelText(/^resposta$/i), "Resposta");
    await user.selectOptions(screen.getByLabelText(/dificuldade/i), "HARD");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(createCardActionMock).toHaveBeenCalledWith(expect.objectContaining({ difficulty: "HARD" })),
    );
  });

  it("mapeia fieldErrors do servidor (ex.: tags) para o campo correspondente do cliente", async () => {
    createCardActionMock.mockResolvedValue({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", fieldErrors: { tags: ["Muitas tags."] } },
    });
    const user = userEvent.setup();

    render(<CardFormDialog open onOpenChange={onOpenChange} decks={decks} subjects={subjects} onCreated={onCreated} />);

    await user.selectOptions(screen.getByLabelText(/^baralho$/i), "deck-1");
    await user.type(screen.getByLabelText(/^pergunta$/i), "Pergunta");
    await user.type(screen.getByLabelText(/^resposta$/i), "Resposta");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Muitas tags.")).toBeTruthy();
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
