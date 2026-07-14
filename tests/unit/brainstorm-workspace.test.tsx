import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BrainstormBoardDTO, BrainstormCardDTO, BrainstormColumnDTO } from "@/contracts/brainstorm";

const { createBoardActionMock, getBoardActionMock, listTopicOptionsActionMock, toastSuccessMock, toastErrorMock } =
  vi.hoisted(() => ({
    createBoardActionMock: vi.fn(),
    getBoardActionMock: vi.fn(),
    listTopicOptionsActionMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
  }));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/brainstorm", () => ({
  createBoardAction: createBoardActionMock,
  getBoardAction: getBoardActionMock,
  // Ações usadas por `KanbanBoard`/`CardFormDialog` quando há um quadro ativo — não exercitadas
  // diretamente nestes testes (o quadro renderizado aqui está sempre vazio), mas precisam existir
  // no módulo mockado para o import não falhar.
  moveCardAction: vi.fn(),
  markResolvedAction: vi.fn(),
  convertToFlashcardAction: vi.fn(),
  convertToStudyTaskAction: vi.fn(),
  deleteCardAction: vi.fn(),
  createCardAction: vi.fn(),
  updateCardAction: vi.fn(),
}));

vi.mock("@/server/actions/simulations", () => ({
  listTopicOptionsAction: listTopicOptionsActionMock,
}));

const { BrainstormWorkspace } = await import("@/components/brainstorm/brainstorm-workspace");

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

function makeEmptyColumns(): BrainstormColumnDTO[] {
  return ["Ideias", "Estudar", "Revisar", "Dúvidas", "Resolvido"].map((title, order) => ({
    id: `col-${title.toLowerCase()}`,
    title,
    order,
    cards: [],
  }));
}

describe("BrainstormWorkspace", () => {
  beforeEach(() => {
    createBoardActionMock.mockReset();
    getBoardActionMock.mockReset();
    listTopicOptionsActionMock.mockReset();
    listTopicOptionsActionMock.mockResolvedValue({ ok: true, data: [] });
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("sem quadro nenhum, oferece criar o primeiro e mostra o quadro Kanban após criar", async () => {
    const createdBoard: BrainstormBoardDTO = {
      id: "board-novo",
      title: "Meu primeiro quadro",
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:00.000Z",
      columns: makeEmptyColumns(),
    };
    createBoardActionMock.mockResolvedValue({ ok: true, data: createdBoard });
    const user = userEvent.setup();

    render(<BrainstormWorkspace initialBoards={[]} initialBoard={null} subjects={[]} />);

    expect(screen.getByText(/nenhum quadro de brainstorm ainda/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /novo quadro/i }));
    await user.type(screen.getByLabelText(/título do quadro/i), "Meu primeiro quadro");
    await user.click(screen.getByRole("button", { name: /^criar quadro$/i }));

    await waitFor(() => expect(createBoardActionMock).toHaveBeenCalledWith({ title: "Meu primeiro quadro" }));
    expect(await screen.findByText("Ideias")).toBeTruthy();
    expect(screen.getByText("Resolvido")).toBeTruthy();
    expect(screen.queryByText(/nenhum quadro de brainstorm ainda/i)).toBeNull();
  });

  it("alterna para a aba Mapa e agrupa os cartões por matéria", async () => {
    const columns = makeEmptyColumns();
    columns[0] = {
      ...columns[0]!,
      cards: [
        makeCard({
          id: "card-1",
          columnId: columns[0]!.id,
          title: "Resumo de direito administrativo",
          order: 0,
          subjectId: "subject-1",
          subjectName: "Direito Administrativo",
        }),
        makeCard({ id: "card-2", columnId: columns[0]!.id, title: "Ideia solta sem matéria", order: 1 }),
      ],
    };
    const board: BrainstormBoardDTO = {
      id: "board-1",
      title: "Quadro de teste",
      createdAt: "2026-07-08T09:00:00.000Z",
      updatedAt: "2026-07-08T09:00:00.000Z",
      columns,
    };
    const user = userEvent.setup();

    render(
      <BrainstormWorkspace
        initialBoards={[
          { id: "board-1", title: "Quadro de teste", columnCount: 5, cardCount: 2, createdAt: board.createdAt, updatedAt: board.updatedAt },
        ]}
        initialBoard={board}
        subjects={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /mapa/i }));

    expect(screen.getByText("Direito Administrativo")).toBeTruthy();
    expect(screen.getByText("Sem matéria")).toBeTruthy();
    expect(screen.getByText("Resumo de direito administrativo")).toBeTruthy();
    expect(screen.getByText("Ideia solta sem matéria")).toBeTruthy();
  });

  it("troca de quadro pelo seletor quando há mais de um quadro", async () => {
    const boardTwo: BrainstormBoardDTO = {
      id: "board-2",
      title: "Segundo quadro",
      createdAt: "2026-07-05T00:00:00.000Z",
      updatedAt: "2026-07-05T00:00:00.000Z",
      columns: makeEmptyColumns(),
    };
    getBoardActionMock.mockResolvedValue({ ok: true, data: boardTwo });
    const board: BrainstormBoardDTO = {
      id: "board-1",
      title: "Primeiro quadro",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      columns: makeEmptyColumns(),
    };
    const user = userEvent.setup();

    render(
      <BrainstormWorkspace
        initialBoards={[
          { id: "board-1", title: "Primeiro quadro", columnCount: 5, cardCount: 0, createdAt: board.createdAt, updatedAt: board.updatedAt },
          { id: "board-2", title: "Segundo quadro", columnCount: 5, cardCount: 0, createdAt: boardTwo.createdAt, updatedAt: boardTwo.updatedAt },
        ]}
        initialBoard={board}
        subjects={[]}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/^quadro$/i, { selector: "select" }), "board-2");

    await waitFor(() => expect(getBoardActionMock).toHaveBeenCalledWith({ boardId: "board-2" }));
  });
});
