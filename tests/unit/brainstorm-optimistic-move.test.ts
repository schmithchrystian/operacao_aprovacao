import { describe, expect, it } from "vitest";
import type { BrainstormBoardDTO, BrainstormCardDTO } from "@/contracts/brainstorm";
import { moveCardOptimistically } from "@/components/brainstorm/optimistic-move";

function makeCard(id: string, columnId: string, order: number, resolvido = false): BrainstormCardDTO {
  return {
    id,
    columnId,
    type: "IDEIA",
    title: `Cartão ${id}`,
    content: null,
    tags: [],
    subjectId: null,
    subjectName: null,
    topicId: null,
    topicName: null,
    priority: "MEDIUM",
    status: "OPEN",
    resolvido,
    order,
    convertedFlashcardId: null,
    convertedStudyPlanItemId: null,
    createdAt: "2026-07-08T09:00:00.000Z",
    updatedAt: "2026-07-08T09:00:00.000Z",
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
        cards: [makeCard("a", "col-ideias", 0), makeCard("b", "col-ideias", 1), makeCard("c", "col-ideias", 2)],
      },
      { id: "col-estudar", title: "Estudar", order: 1, cards: [] },
      {
        id: "col-resolvido",
        title: "Resolvido",
        order: 4,
        cards: [makeCard("d", "col-resolvido", 0, true)],
      },
    ],
  };
}

describe("moveCardOptimistically", () => {
  it("reordena dentro da mesma coluna (toIndex é a posição no array JÁ SEM o cartão movido)", () => {
    const board = buildBoard();

    // col-ideias = [a, b, c]; mover "a" para toIndex=1 no array sem "a" ([b, c]) -> [b, a, c].
    const result = moveCardOptimistically(board, "a", "col-ideias", 1);

    const ideias = result.columns.find((c) => c.id === "col-ideias")!;
    expect(ideias.cards.map((c) => c.id)).toEqual(["b", "a", "c"]);
    expect(ideias.cards.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it("move um cartão para outra coluna vazia (append no fim)", () => {
    const board = buildBoard();

    const result = moveCardOptimistically(board, "b", "col-estudar", 0);

    const ideias = result.columns.find((c) => c.id === "col-ideias")!;
    const estudar = result.columns.find((c) => c.id === "col-estudar")!;
    expect(ideias.cards.map((c) => c.id)).toEqual(["a", "c"]);
    expect(estudar.cards.map((c) => c.id)).toEqual(["b"]);
    expect(estudar.cards[0]?.columnId).toBe("col-estudar");
  });

  it("marca resolvido=true ao mover para a coluna Resolvido, e resolvido=false ao sair dela", () => {
    const board = buildBoard();

    const movedIn = moveCardOptimistically(board, "a", "col-resolvido", 1);
    const resolvidoColumn = movedIn.columns.find((c) => c.id === "col-resolvido")!;
    const movedCard = resolvidoColumn.cards.find((c) => c.id === "a");
    expect(movedCard?.resolvido).toBe(true);

    const movedOut = moveCardOptimistically(board, "d", "col-ideias", 0);
    const ideiasColumn = movedOut.columns.find((c) => c.id === "col-ideias")!;
    const cardD = ideiasColumn.cards.find((c) => c.id === "d");
    expect(cardD?.resolvido).toBe(false);
  });

  it("clampa índices fora do intervalo em vez de lançar erro", () => {
    const board = buildBoard();

    const result = moveCardOptimistically(board, "a", "col-ideias", 999);

    const ideias = result.columns.find((c) => c.id === "col-ideias")!;
    expect(ideias.cards.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("devolve o board inalterado quando o cartão não existe", () => {
    const board = buildBoard();

    const result = moveCardOptimistically(board, "cartao-inexistente", "col-estudar", 0);

    expect(result).toBe(board);
  });

  it("devolve o board inalterado quando a coluna destino não existe", () => {
    const board = buildBoard();

    const result = moveCardOptimistically(board, "a", "col-inexistente", 0);

    expect(result).toBe(board);
  });

  it("não afeta cartões de colunas não envolvidas na movimentação", () => {
    const board = buildBoard();

    const result = moveCardOptimistically(board, "a", "col-estudar", 0);

    const resolvidoColumn = result.columns.find((c) => c.id === "col-resolvido")!;
    expect(resolvidoColumn.cards.map((c) => c.id)).toEqual(["d"]);
  });
});
