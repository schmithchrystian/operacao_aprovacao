import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";
import type { BrainstormBoardDTO } from "@/contracts/brainstorm";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por "@/server/authorization").
const {
  createBoard,
  listBoards,
  getBoard,
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  markResolved,
  convertToFlashcard,
  convertToStudyTask,
  listFlashcardDraftsByUserId,
} = await import("@/server/services/brainstorm");
const { __resetMockBrainstormBoardStore } = await import("@/server/repositories/mock/brainstorm-board-repository");
const { __resetMockBrainstormColumnStore } = await import("@/server/repositories/mock/brainstorm-column-repository");
const { __resetMockBrainstormCardStore } = await import("@/server/repositories/mock/brainstorm-card-repository");
const { __resetMockStudyPlanStore } = await import("@/server/repositories/mock/study-plan-repository");
const { __resetMockStudyPlanItemStore } = await import("@/server/repositories/mock/study-plan-item-repository");
const { __resetFlashcardDraftStore } = await import("@/server/services/brainstorm/flashcard-draft-store");
const { SUBJECT_IDS, TOPIC_IDS } = await import("@/mocks");

/**
 * Testes de serviço (I/O) do domínio "Brainstorm" (Fase 13 — CLAUDE.md §20): criação de
 * quadro/cartão, edição, mover (mesma coluna e entre colunas, com recompactação e
 * idempotência), marcar resolvido e as duas conversões — incluindo autorização (recurso de
 * outro usuário sempre rejeitado, anti-IDOR).
 */
function fakeSession(id: string): NextAuthSession {
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

const FIXED_NOW = new Date("2026-07-14T10:00:00.000Z");
const LATER_NOW = new Date("2026-07-20T10:00:00.000Z");

async function seedBoard(userId: string): Promise<BrainstormBoardDTO> {
  authMock.mockResolvedValue(fakeSession(userId));
  return createBoard(userId, { title: "Quadro de teste" }, FIXED_NOW);
}

function columnId(board: BrainstormBoardDTO, title: string): string {
  const column = board.columns.find((c) => c.title === title);
  if (!column) throw new Error(`Coluna não encontrada no quadro de teste: ${title}`);
  return column.id;
}

describe("services/brainstorm", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockBrainstormBoardStore();
    __resetMockBrainstormColumnStore();
    __resetMockBrainstormCardStore();
    __resetMockStudyPlanStore();
    __resetMockStudyPlanItemStore();
    __resetFlashcardDraftStore();
  });

  describe("createBoard / listBoards / getBoard", () => {
    it("createBoard gera as 5 colunas padrão, na ordem certa, todas vazias", async () => {
      const board = await seedBoard("board-create-1");

      expect(board.columns.map((c) => c.title)).toEqual(["Ideias", "Estudar", "Revisar", "Dúvidas", "Resolvido"]);
      expect(board.columns.map((c) => c.order)).toEqual([0, 1, 2, 3, 4]);
      for (const column of board.columns) {
        expect(column.cards).toEqual([]);
      }
    });

    it("listBoards só lista os quadros do próprio usuário", async () => {
      const userId = "board-list-1";
      await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      await createBoard(userId, { title: "Segundo quadro" }, FIXED_NOW);

      const boards = await listBoards(userId);
      expect(boards.length).toBe(2);
      expect(boards.every((b) => b.columnCount === 5 && b.cardCount === 0)).toBe(true);
    });

    it("getBoard rejeita ler o quadro de outro usuário (anti-IDOR)", async () => {
      const board = await seedBoard("board-owner-1");

      authMock.mockResolvedValue(fakeSession("intruder-1"));
      await expect(getBoard("intruder-1", board.id)).rejects.toThrow();
    });

    it("getBoard rejeita um id de quadro inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("board-missing-1"));
      await expect(getBoard("board-missing-1", "quadro-inexistente")).rejects.toThrow();
    });
  });

  describe("createCard / updateCard / deleteCard", () => {
    it("valida matéria/assunto inexistentes e rejeita assunto de outra matéria", async () => {
      const userId = "card-create-invalid";
      const board = await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      const ideias = columnId(board, "Ideias");

      await expect(
        createCard(
          userId,
          { columnId: ideias, type: "IDEIA", title: "x", tags: [], priority: "MEDIUM", subjectId: "subject-inexistente" },
          FIXED_NOW,
        ),
      ).rejects.toThrow();

      await expect(
        createCard(
          userId,
          { columnId: ideias, type: "IDEIA", title: "x", tags: [], priority: "MEDIUM", topicId: "topic-inexistente" },
          FIXED_NOW,
        ),
      ).rejects.toThrow();

      await expect(
        createCard(
          userId,
          {
            columnId: ideias,
            type: "IDEIA",
            title: "x",
            tags: [],
            priority: "MEDIUM",
            subjectId: SUBJECT_IDS.direitoConstitucional,
            // Pertence a Direito Administrativo, não a Direito Constitucional.
            topicId: TOPIC_IDS.atosAdministrativos,
          },
          FIXED_NOW,
        ),
      ).rejects.toThrow();
    });

    it("cria ao final da coluna (order incremental)", async () => {
      const userId = "card-create-order";
      const board = await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      const ideias = columnId(board, "Ideias");

      const first = await createCard(
        userId,
        { columnId: ideias, type: "IDEIA", title: "Primeiro", tags: [], priority: "MEDIUM" },
        FIXED_NOW,
      );
      const second = await createCard(
        userId,
        { columnId: ideias, type: "DUVIDA", title: "Segundo", tags: [], priority: "LOW" },
        FIXED_NOW,
      );

      expect(first.order).toBe(0);
      expect(second.order).toBe(1);
      expect(first.resolvido).toBe(false);
    });

    it("updateCard atualiza título/conteúdo/tags/prioridade", async () => {
      const userId = "card-update-basic";
      const board = await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      const card = await createCard(
        userId,
        { columnId: columnId(board, "Ideias"), type: "IDEIA", title: "Original", tags: ["a"], priority: "LOW" },
        FIXED_NOW,
      );

      const updated = await updateCard(
        userId,
        { cardId: card.id, title: "Atualizado", content: "Novo conteúdo", tags: ["b", "c"], priority: "HIGH" },
        FIXED_NOW,
      );

      expect(updated.title).toBe("Atualizado");
      expect(updated.content).toBe("Novo conteúdo");
      expect(updated.tags).toEqual(["b", "c"]);
      expect(updated.priority).toBe("HIGH");
    });

    it("updateCard aceita content:null explícito para limpar o campo (distinto de omitido)", async () => {
      const userId = "card-update-clear-content";
      const board = await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      const card = await createCard(
        userId,
        { columnId: columnId(board, "Ideias"), type: "IDEIA", title: "T", content: "Algo", tags: [], priority: "MEDIUM" },
        FIXED_NOW,
      );

      const untouched = await updateCard(userId, { cardId: card.id, title: "T2" }, FIXED_NOW);
      expect(untouched.content).toBe("Algo"); // omitido -> não altera

      const cleared = await updateCard(userId, { cardId: card.id, content: null }, FIXED_NOW);
      expect(cleared.content).toBeNull(); // null explícito -> limpa
    });

    it("updateCard rejeita cartão de outro usuário (anti-IDOR)", async () => {
      const owner = "card-owner-update";
      const board = await seedBoard(owner);
      authMock.mockResolvedValue(fakeSession(owner));
      const card = await createCard(
        owner,
        { columnId: columnId(board, "Ideias"), type: "IDEIA", title: "Card", tags: [], priority: "MEDIUM" },
        FIXED_NOW,
      );

      authMock.mockResolvedValue(fakeSession("intruder-update"));
      await expect(updateCard("intruder-update", { cardId: card.id, title: "Hack" }, FIXED_NOW)).rejects.toThrow();
    });

    it("deleteCard remove o cartão e recompacta a ordem dos restantes", async () => {
      const userId = "delete-card-1";
      const board = await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      const ideias = columnId(board, "Ideias");

      const a = await createCard(userId, { columnId: ideias, type: "IDEIA", title: "A", tags: [], priority: "MEDIUM" }, FIXED_NOW);
      const b = await createCard(userId, { columnId: ideias, type: "IDEIA", title: "B", tags: [], priority: "MEDIUM" }, FIXED_NOW);
      const c = await createCard(userId, { columnId: ideias, type: "IDEIA", title: "C", tags: [], priority: "MEDIUM" }, FIXED_NOW);

      await deleteCard(userId, b.id, FIXED_NOW);

      const refreshed = await getBoard(userId, board.id);
      const refreshedIdeias = refreshed.columns.find((col) => col.id === ideias)!;
      expect(refreshedIdeias.cards.map((card) => card.id)).toEqual([a.id, c.id]);
      expect(refreshedIdeias.cards.map((card) => card.order)).toEqual([0, 1]);
    });

    it("deleteCard rejeita cartão de outro usuário (anti-IDOR)", async () => {
      const owner = "delete-owner";
      const board = await seedBoard(owner);
      authMock.mockResolvedValue(fakeSession(owner));
      const card = await createCard(
        owner,
        { columnId: columnId(board, "Ideias"), type: "IDEIA", title: "A", tags: [], priority: "MEDIUM" },
        FIXED_NOW,
      );

      authMock.mockResolvedValue(fakeSession("intruder-delete"));
      await expect(deleteCard("intruder-delete", card.id, FIXED_NOW)).rejects.toThrow();
    });
  });

  describe("moveCard — persiste coluna + ordem, recompacta e é idempotente", () => {
    it("reordena dentro da mesma coluna", async () => {
      const userId = "move-same-column";
      const board = await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      const ideias = columnId(board, "Ideias");

      const a = await createCard(userId, { columnId: ideias, type: "IDEIA", title: "A", tags: [], priority: "MEDIUM" }, FIXED_NOW);
      const b = await createCard(userId, { columnId: ideias, type: "IDEIA", title: "B", tags: [], priority: "MEDIUM" }, FIXED_NOW);
      const c = await createCard(userId, { columnId: ideias, type: "IDEIA", title: "C", tags: [], priority: "MEDIUM" }, FIXED_NOW);

      // Move "A" (índice 0) para o índice 2 dentre os 2 restantes (B, C) -> B, C, A.
      await moveCard(userId, { cardId: a.id, toColumnId: ideias, toIndex: 2 }, FIXED_NOW);

      const refreshed = await getBoard(userId, board.id);
      const refreshedIdeias = refreshed.columns.find((col) => col.id === ideias)!;
      expect(refreshedIdeias.cards.map((card) => card.id)).toEqual([b.id, c.id, a.id]);
      expect(refreshedIdeias.cards.map((card) => card.order)).toEqual([0, 1, 2]);
    });

    it("move entre colunas e recompacta origem e destino (contíguo a partir de 0)", async () => {
      const userId = "move-cross-column";
      const board = await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      const ideias = columnId(board, "Ideias");
      const estudar = columnId(board, "Estudar");

      const a = await createCard(userId, { columnId: ideias, type: "IDEIA", title: "A", tags: [], priority: "MEDIUM" }, FIXED_NOW);
      const b = await createCard(userId, { columnId: ideias, type: "IDEIA", title: "B", tags: [], priority: "MEDIUM" }, FIXED_NOW);
      const x = await createCard(userId, { columnId: estudar, type: "IDEIA", title: "X", tags: [], priority: "MEDIUM" }, FIXED_NOW);

      const moved = await moveCard(userId, { cardId: a.id, toColumnId: estudar, toIndex: 0 }, FIXED_NOW);
      expect(moved.columnId).toBe(estudar);

      const refreshed = await getBoard(userId, board.id);
      const refreshedIdeias = refreshed.columns.find((col) => col.id === ideias)!;
      const refreshedEstudar = refreshed.columns.find((col) => col.id === estudar)!;

      expect(refreshedIdeias.cards.map((card) => card.id)).toEqual([b.id]);
      expect(refreshedIdeias.cards.map((card) => card.order)).toEqual([0]);

      expect(refreshedEstudar.cards.map((card) => card.id)).toEqual([a.id, x.id]);
      expect(refreshedEstudar.cards.map((card) => card.order)).toEqual([0, 1]);
    });

    it("é idempotente — repetir o mesmo destino final não gera nenhuma escrita adicional", async () => {
      const userId = "move-idempotent";
      const board = await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      const ideias = columnId(board, "Ideias");
      const estudar = columnId(board, "Estudar");

      const a = await createCard(userId, { columnId: ideias, type: "IDEIA", title: "A", tags: [], priority: "MEDIUM" }, FIXED_NOW);

      const first = await moveCard(userId, { cardId: a.id, toColumnId: estudar, toIndex: 0 }, FIXED_NOW);
      // 2ª chamada com `now` BEM depois — se ainda assim `updatedAt` não mudar, prova que não
      // houve escrita nenhuma (idempotência real, não coincidência de timestamp).
      const second = await moveCard(userId, { cardId: a.id, toColumnId: estudar, toIndex: 0 }, LATER_NOW);

      expect(second.updatedAt).toBe(first.updatedAt);
      expect(second.order).toBe(first.order);
    });

    it("rejeita mover para uma coluna de outro quadro (mesmo usuário)", async () => {
      const userId = "move-cross-board";
      const boardA = await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      const boardB = await createBoard(userId, { title: "Outro quadro" }, FIXED_NOW);

      const card = await createCard(
        userId,
        { columnId: columnId(boardA, "Ideias"), type: "IDEIA", title: "A", tags: [], priority: "MEDIUM" },
        FIXED_NOW,
      );

      await expect(
        moveCard(userId, { cardId: card.id, toColumnId: columnId(boardB, "Estudar"), toIndex: 0 }, FIXED_NOW),
      ).rejects.toThrow();
    });

    it("rejeita mover cartão de outro usuário (anti-IDOR)", async () => {
      const owner = "move-owner";
      const board = await seedBoard(owner);
      authMock.mockResolvedValue(fakeSession(owner));
      const card = await createCard(
        owner,
        { columnId: columnId(board, "Ideias"), type: "IDEIA", title: "A", tags: [], priority: "MEDIUM" },
        FIXED_NOW,
      );

      authMock.mockResolvedValue(fakeSession("intruder-move"));
      await expect(
        moveCard("intruder-move", { cardId: card.id, toColumnId: columnId(board, "Estudar"), toIndex: 0 }, FIXED_NOW),
      ).rejects.toThrow();
    });
  });

  describe("markResolved", () => {
    it("move o cartão para a coluna Resolvido, deriva resolvido=true e não altera status", async () => {
      const userId = "resolve-basic";
      const board = await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      const ideias = columnId(board, "Ideias");
      const resolvido = columnId(board, "Resolvido");

      const card = await createCard(
        userId,
        { columnId: ideias, type: "DUVIDA", title: "Dúvida", tags: [], priority: "MEDIUM" },
        FIXED_NOW,
      );
      expect(card.resolvido).toBe(false);

      const resolved = await markResolved(userId, card.id, FIXED_NOW);
      expect(resolved.columnId).toBe(resolvido);
      expect(resolved.resolvido).toBe(true);
      expect(resolved.status).toBe("OPEN");

      const refreshed = await getBoard(userId, board.id);
      expect(refreshed.columns.find((col) => col.id === ideias)!.cards).toEqual([]);
    });

    it("é idempotente — chamar de novo sobre um cartão já resolvido não altera nada", async () => {
      const userId = "resolve-idempotent";
      const board = await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      const card = await createCard(
        userId,
        { columnId: columnId(board, "Ideias"), type: "IDEIA", title: "A", tags: [], priority: "MEDIUM" },
        FIXED_NOW,
      );

      const first = await markResolved(userId, card.id, FIXED_NOW);
      const second = await markResolved(userId, card.id, LATER_NOW);

      expect(second.updatedAt).toBe(first.updatedAt);
      expect(second.order).toBe(first.order);
      expect(second.resolvido).toBe(true);
    });

    it("rejeita cartão de outro usuário (anti-IDOR)", async () => {
      const owner = "resolve-owner";
      const board = await seedBoard(owner);
      authMock.mockResolvedValue(fakeSession(owner));
      const card = await createCard(
        owner,
        { columnId: columnId(board, "Ideias"), type: "IDEIA", title: "A", tags: [], priority: "MEDIUM" },
        FIXED_NOW,
      );

      authMock.mockResolvedValue(fakeSession("intruder-resolve"));
      await expect(markResolved("intruder-resolve", card.id, FIXED_NOW)).rejects.toThrow();
    });
  });

  describe("convertToFlashcard / convertToStudyTask — idempotentes e coerentes", () => {
    it("convertToFlashcard marca CONVERTED e não gera um 2º rascunho ao repetir", async () => {
      const userId = "convert-flashcard-1";
      const board = await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      const card = await createCard(
        userId,
        { columnId: columnId(board, "Ideias"), type: "IDEIA", title: "Ideia", content: "Conteúdo", tags: [], priority: "MEDIUM" },
        FIXED_NOW,
      );

      const first = await convertToFlashcard(userId, card.id, FIXED_NOW);
      expect(first.status).toBe("CONVERTED");
      expect(first.convertedFlashcardId).not.toBeNull();
      expect(listFlashcardDraftsByUserId(userId).length).toBe(1);

      const second = await convertToFlashcard(userId, card.id, LATER_NOW);
      expect(second.convertedFlashcardId).toBe(first.convertedFlashcardId);
      expect(listFlashcardDraftsByUserId(userId).length).toBe(1); // não duplicou o rascunho
    });

    it("convertToFlashcard rejeita cartão de outro usuário (anti-IDOR)", async () => {
      const owner = "convert-flashcard-owner";
      const board = await seedBoard(owner);
      authMock.mockResolvedValue(fakeSession(owner));
      const card = await createCard(
        owner,
        { columnId: columnId(board, "Ideias"), type: "IDEIA", title: "A", tags: [], priority: "MEDIUM" },
        FIXED_NOW,
      );

      authMock.mockResolvedValue(fakeSession("intruder-flashcard"));
      await expect(convertToFlashcard("intruder-flashcard", card.id, FIXED_NOW)).rejects.toThrow();
    });

    it("convertToStudyTask cria um item real no plano (criando o plano se necessário) e não duplica ao repetir", async () => {
      const userId = "convert-study-task-1";
      const board = await seedBoard(userId);
      authMock.mockResolvedValue(fakeSession(userId));
      const card = await createCard(
        userId,
        {
          columnId: columnId(board, "Estudar"),
          type: "IDEIA",
          title: "Estudar matemática",
          tags: [],
          priority: "HIGH",
          subjectId: SUBJECT_IDS.matematica,
        },
        FIXED_NOW,
      );

      const first = await convertToStudyTask(userId, card.id, FIXED_NOW);
      expect(first.status).toBe("CONVERTED");
      expect(first.convertedStudyPlanItemId).not.toBeNull();

      const second = await convertToStudyTask(userId, card.id, LATER_NOW);
      expect(second.convertedStudyPlanItemId).toBe(first.convertedStudyPlanItemId);
    });

    it("convertToStudyTask rejeita cartão de outro usuário (anti-IDOR)", async () => {
      const owner = "convert-study-owner";
      const board = await seedBoard(owner);
      authMock.mockResolvedValue(fakeSession(owner));
      const card = await createCard(
        owner,
        { columnId: columnId(board, "Ideias"), type: "IDEIA", title: "A", tags: [], priority: "MEDIUM" },
        FIXED_NOW,
      );

      authMock.mockResolvedValue(fakeSession("intruder-study"));
      await expect(convertToStudyTask("intruder-study", card.id, FIXED_NOW)).rejects.toThrow();
    });
  });
});
