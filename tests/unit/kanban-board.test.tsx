import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BrainstormBoardDTO, BrainstormCardDTO } from "@/contracts/brainstorm";

const {
  getBoardActionMock,
  moveCardActionMock,
  markResolvedActionMock,
  convertToFlashcardActionMock,
  convertToStudyTaskActionMock,
  deleteCardActionMock,
  createCardActionMock,
  updateCardActionMock,
  listTopicOptionsActionMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  getBoardActionMock: vi.fn(),
  moveCardActionMock: vi.fn(),
  markResolvedActionMock: vi.fn(),
  convertToFlashcardActionMock: vi.fn(),
  convertToStudyTaskActionMock: vi.fn(),
  deleteCardActionMock: vi.fn(),
  createCardActionMock: vi.fn(),
  updateCardActionMock: vi.fn(),
  listTopicOptionsActionMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/brainstorm", () => ({
  getBoardAction: getBoardActionMock,
  moveCardAction: moveCardActionMock,
  markResolvedAction: markResolvedActionMock,
  convertToFlashcardAction: convertToFlashcardActionMock,
  convertToStudyTaskAction: convertToStudyTaskActionMock,
  deleteCardAction: deleteCardActionMock,
  createCardAction: createCardActionMock,
  updateCardAction: updateCardActionMock,
}));

vi.mock("@/server/actions/simulations", () => ({
  listTopicOptionsAction: listTopicOptionsActionMock,
}));

const { KanbanBoard } = await import("@/components/brainstorm/kanban-board");

function makeCard(
  overrides: Partial<BrainstormCardDTO> & Pick<BrainstormCardDTO, "id" | "columnId" | "title" | "order">,
): BrainstormCardDTO {
  return {
    type: "IDEIA",
    content: null,
    tags: [],
    subjectId: null,
    subjectName: null,
    topicId: null,
    topicName: null,
    priority: "MEDIUM",
    status: "OPEN",
    resolvido: false,
    convertedFlashcardId: null,
    convertedStudyPlanItemId: null,
    createdAt: "2026-07-08T09:00:00.000Z",
    updatedAt: "2026-07-08T09:00:00.000Z",
    ...overrides,
  };
}

function buildBoard(): BrainstormBoardDTO {
  return {
    id: "board-1",
    title: "Quadro de teste",
    createdAt: "2026-07-08T09:00:00.000Z",
    updatedAt: "2026-07-08T09:00:00.000Z",
    columns: [
      {
        id: "col-ideias",
        title: "Ideias",
        order: 0,
        cards: [
          makeCard({ id: "card-1", columnId: "col-ideias", title: "Estudar administrativo", order: 0 }),
          makeCard({ id: "card-2", columnId: "col-ideias", title: "Dúvida sobre prazos", order: 1 }),
        ],
      },
      { id: "col-estudar", title: "Estudar", order: 1, cards: [] },
      { id: "col-resolvido", title: "Resolvido", order: 4, cards: [] },
    ],
  };
}

describe("KanbanBoard", () => {
  const onBoardChanged = vi.fn();

  beforeEach(() => {
    getBoardActionMock.mockReset();
    moveCardActionMock.mockReset();
    markResolvedActionMock.mockReset();
    convertToFlashcardActionMock.mockReset();
    convertToStudyTaskActionMock.mockReset();
    deleteCardActionMock.mockReset();
    createCardActionMock.mockReset();
    updateCardActionMock.mockReset();
    listTopicOptionsActionMock.mockReset();
    listTopicOptionsActionMock.mockResolvedValue({ ok: true, data: [] });
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    onBoardChanged.mockReset();
  });

  it("mostra as colunas e os cartões do quadro", () => {
    render(<KanbanBoard board={buildBoard()} subjects={[]} onBoardChanged={onBoardChanged} />);

    expect(screen.getByText("Ideias")).toBeTruthy();
    expect(screen.getByText("Estudar administrativo")).toBeTruthy();
    expect(screen.getByText("Dúvida sobre prazos")).toBeTruthy();
  });

  it("move um cartão para baixo dentro da coluna pelo botão de teclado", async () => {
    moveCardActionMock.mockResolvedValue({ ok: true, data: {} });
    getBoardActionMock.mockResolvedValue({ ok: true, data: buildBoard() });
    const user = userEvent.setup();

    render(<KanbanBoard board={buildBoard()} subjects={[]} onBoardChanged={onBoardChanged} />);

    await user.click(screen.getByRole("button", { name: /mover "estudar administrativo" para baixo/i }));

    await waitFor(() =>
      expect(moveCardActionMock).toHaveBeenCalledWith({ cardId: "card-1", toColumnId: "col-ideias", toIndex: 1 }),
    );
    await waitFor(() => expect(getBoardActionMock).toHaveBeenCalledWith({ boardId: "board-1" }));
    expect(onBoardChanged).toHaveBeenCalled();
  });

  it("move um cartão para a próxima coluna, ao final dela", async () => {
    moveCardActionMock.mockResolvedValue({ ok: true, data: {} });
    getBoardActionMock.mockResolvedValue({ ok: true, data: buildBoard() });
    const user = userEvent.setup();

    render(<KanbanBoard board={buildBoard()} subjects={[]} onBoardChanged={onBoardChanged} />);

    await user.click(screen.getByRole("button", { name: /mover "estudar administrativo" para a coluna estudar/i }));

    await waitFor(() =>
      expect(moveCardActionMock).toHaveBeenCalledWith({ cardId: "card-1", toColumnId: "col-estudar", toIndex: 0 }),
    );
  });

  it("reverte para o board anterior e mostra o erro quando mover falha", async () => {
    moveCardActionMock.mockResolvedValue({ ok: false, error: { code: "X", message: "Falha ao mover." } });
    const user = userEvent.setup();
    const board = buildBoard();

    render(<KanbanBoard board={board} subjects={[]} onBoardChanged={onBoardChanged} />);

    await user.click(screen.getByRole("button", { name: /mover "estudar administrativo" para baixo/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Falha ao mover."));
    expect(onBoardChanged).toHaveBeenLastCalledWith(board);
    expect(getBoardActionMock).not.toHaveBeenCalled();
  });

  it("marca um cartão como resolvido", async () => {
    markResolvedActionMock.mockResolvedValue({ ok: true, data: {} });
    getBoardActionMock.mockResolvedValue({ ok: true, data: buildBoard() });
    const user = userEvent.setup();

    render(<KanbanBoard board={buildBoard()} subjects={[]} onBoardChanged={onBoardChanged} />);

    await user.click(screen.getByRole("button", { name: /resolver "estudar administrativo"/i }));

    await waitFor(() => expect(markResolvedActionMock).toHaveBeenCalledWith({ cardId: "card-1" }));
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("converte um cartão em flashcard pelo menu de ações", async () => {
    convertToFlashcardActionMock.mockResolvedValue({ ok: true, data: {} });
    getBoardActionMock.mockResolvedValue({ ok: true, data: buildBoard() });
    const user = userEvent.setup();

    render(<KanbanBoard board={buildBoard()} subjects={[]} onBoardChanged={onBoardChanged} />);

    await user.click(screen.getByRole("button", { name: /mais ações do cartão "estudar administrativo"/i }));
    await user.click(await screen.findByText(/virar flashcard/i));

    await waitFor(() => expect(convertToFlashcardActionMock).toHaveBeenCalledWith({ cardId: "card-1" }));
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("converte um cartão em tarefa de estudo pelo menu de ações", async () => {
    convertToStudyTaskActionMock.mockResolvedValue({ ok: true, data: {} });
    getBoardActionMock.mockResolvedValue({ ok: true, data: buildBoard() });
    const user = userEvent.setup();

    render(<KanbanBoard board={buildBoard()} subjects={[]} onBoardChanged={onBoardChanged} />);

    await user.click(screen.getByRole("button", { name: /mais ações do cartão "estudar administrativo"/i }));
    await user.click(await screen.findByText(/virar tarefa de estudo/i));

    await waitFor(() => expect(convertToStudyTaskActionMock).toHaveBeenCalledWith({ cardId: "card-1" }));
  });

  it("exclui um cartão depois de confirmar no dialog", async () => {
    deleteCardActionMock.mockResolvedValue({ ok: true, data: { cardId: "card-1" } });
    getBoardActionMock.mockResolvedValue({ ok: true, data: buildBoard() });
    const user = userEvent.setup();

    render(<KanbanBoard board={buildBoard()} subjects={[]} onBoardChanged={onBoardChanged} />);

    await user.click(screen.getByRole("button", { name: /mais ações do cartão "estudar administrativo"/i }));
    await user.click(await screen.findByText(/^excluir$/i));

    expect(await screen.findByText(/excluir cartão\?/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(deleteCardActionMock).toHaveBeenCalledWith({ cardId: "card-1" }));
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("não exclui quando o usuário cancela a confirmação", async () => {
    const user = userEvent.setup();

    render(<KanbanBoard board={buildBoard()} subjects={[]} onBoardChanged={onBoardChanged} />);

    await user.click(screen.getByRole("button", { name: /mais ações do cartão "estudar administrativo"/i }));
    await user.click(await screen.findByText(/^excluir$/i));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(deleteCardActionMock).not.toHaveBeenCalled();
  });

  it("cria um novo cartão pelo botão 'Adicionar cartão' da coluna", async () => {
    createCardActionMock.mockResolvedValue({ ok: true, data: { id: "card-novo" } });
    getBoardActionMock.mockResolvedValue({ ok: true, data: buildBoard() });
    const user = userEvent.setup();

    render(<KanbanBoard board={buildBoard()} subjects={[]} onBoardChanged={onBoardChanged} />);

    const estudarColumn = screen.getByText("Estudar").closest("section");
    expect(estudarColumn).not.toBeNull();
    await user.click(within(estudarColumn as HTMLElement).getByRole("button", { name: /adicionar cartão/i }));

    expect(await screen.findByText(/novo cartão em "estudar"/i)).toBeTruthy();
    await user.type(screen.getByLabelText(/^título$/i), "Nova ideia de estudo");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(createCardActionMock).toHaveBeenCalledWith(
        expect.objectContaining({ columnId: "col-estudar", title: "Nova ideia de estudo" }),
      ),
    );
    await waitFor(() => expect(getBoardActionMock).toHaveBeenCalledWith({ boardId: "board-1" }));
  });

  it("edita um cartão existente pelo menu de ações", async () => {
    updateCardActionMock.mockResolvedValue({ ok: true, data: { id: "card-1" } });
    getBoardActionMock.mockResolvedValue({ ok: true, data: buildBoard() });
    const user = userEvent.setup();

    render(<KanbanBoard board={buildBoard()} subjects={[]} onBoardChanged={onBoardChanged} />);

    await user.click(screen.getByRole("button", { name: /mais ações do cartão "estudar administrativo"/i }));
    await user.click(await screen.findByText(/^editar$/i));

    expect(await screen.findByText(/editar cartão/i)).toBeTruthy();
    const titleInput = screen.getByLabelText(/^título$/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Título atualizado");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(updateCardActionMock).toHaveBeenCalledWith(expect.objectContaining({ cardId: "card-1", title: "Título atualizado" })),
    );
  });
});
