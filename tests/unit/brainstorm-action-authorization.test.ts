import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por "@/server/authorization").
const {
  createBoardAction,
  listBoardsAction,
  getBoardAction,
  createCardAction,
  updateCardAction,
  deleteCardAction,
  moveCardAction,
  markResolvedAction,
  convertToFlashcardAction,
  convertToStudyTaskAction,
} = await import("@/server/actions/brainstorm");
const { __resetMockBrainstormBoardStore } = await import("@/server/repositories/mock/brainstorm-board-repository");
const { __resetMockBrainstormColumnStore } = await import("@/server/repositories/mock/brainstorm-column-repository");
const { __resetMockBrainstormCardStore } = await import("@/server/repositories/mock/brainstorm-card-repository");
const { __resetMockStudyPlanStore } = await import("@/server/repositories/mock/study-plan-repository");
const { __resetMockStudyPlanItemStore } = await import("@/server/repositories/mock/study-plan-item-repository");
const { __resetFlashcardDraftStore } = await import("@/server/services/brainstorm/flashcard-draft-store");

/**
 * Testes de fronteira (Server Actions — ActionResult) do domínio "Brainstorm" (Fase 13):
 * autorização (sessão ausente -> UNAUTHENTICATED; recurso de outro usuário -> NOT_FOUND) e
 * validação de entrada (Zod -> VALIDATION_ERROR) na fronteira, além de um fluxo feliz completo.
 * Mesmo padrão de `tests/unit/study-plan-action-authorization.test.ts`.
 */
function fakeSession(id: string): NextAuthSession {
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("actions/brainstorm — autorização e validação na fronteira (ActionResult)", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockBrainstormBoardStore();
    __resetMockBrainstormColumnStore();
    __resetMockBrainstormCardStore();
    __resetMockStudyPlanStore();
    __resetMockStudyPlanItemStore();
    __resetFlashcardDraftStore();
  });

  describe("createBoardAction", () => {
    it("retorna fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);
      const result = await createBoardAction({ title: "Quadro" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
    });

    it("retorna fail VALIDATION_ERROR com título vazio", async () => {
      authMock.mockResolvedValue(fakeSession("user-board-1"));
      const result = await createBoardAction({ title: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna fail VALIDATION_ERROR com título maior que o limite", async () => {
      authMock.mockResolvedValue(fakeSession("user-board-1b"));
      const result = await createBoardAction({ title: "x".repeat(200) });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna ok com o quadro criado (5 colunas padrão, na ordem certa)", async () => {
      authMock.mockResolvedValue(fakeSession("user-board-2"));
      const result = await createBoardAction({ title: "Meu quadro" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.columns.map((c) => c.title)).toEqual([
          "Ideias",
          "Estudar",
          "Revisar",
          "Dúvidas",
          "Resolvido",
        ]);
      }
    });
  });

  describe("listBoardsAction / getBoardAction", () => {
    it("retorna fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);

      const listResult = await listBoardsAction();
      expect(listResult.ok).toBe(false);
      if (!listResult.ok) expect(listResult.error.code).toBe("UNAUTHENTICATED");

      const getResult = await getBoardAction({ boardId: "b1" });
      expect(getResult.ok).toBe(false);
      if (!getResult.ok) expect(getResult.error.code).toBe("UNAUTHENTICATED");
    });

    it("getBoardAction retorna fail NOT_FOUND para um quadro inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("user-board-3"));
      const result = await getBoardAction({ boardId: "quadro-inexistente" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });

    it("getBoardAction retorna fail NOT_FOUND para o quadro de outro usuário (anti-IDOR)", async () => {
      authMock.mockResolvedValue(fakeSession("user-board-owner"));
      const created = await createBoardAction({ title: "Quadro privado" });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      authMock.mockResolvedValue(fakeSession("user-board-intruder"));
      const result = await getBoardAction({ boardId: created.data.id });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });
  });

  describe("createCardAction / updateCardAction", () => {
    it("retorna fail VALIDATION_ERROR com título vazio", async () => {
      authMock.mockResolvedValue(fakeSession("user-card-1"));
      const board = await createBoardAction({ title: "Quadro" });
      expect(board.ok).toBe(true);
      if (!board.ok) return;

      const result = await createCardAction({ columnId: board.data.columns[0]!.id, title: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna fail VALIDATION_ERROR com tipo de cartão inválido", async () => {
      authMock.mockResolvedValue(fakeSession("user-card-1b"));
      const board = await createBoardAction({ title: "Quadro" });
      expect(board.ok).toBe(true);
      if (!board.ok) return;

      const result = await createCardAction({
        columnId: board.data.columns[0]!.id,
        title: "Card",
        type: "NAO_EXISTE",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("createCardAction retorna fail NOT_FOUND para uma coluna inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("user-card-2"));
      const result = await createCardAction({ columnId: "coluna-inexistente", title: "Card" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });

    it("retorna fail VALIDATION_ERROR quando updateCardAction não informa nenhum campo", async () => {
      authMock.mockResolvedValue(fakeSession("user-card-3"));
      const result = await updateCardAction({ cardId: "card-x" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("updateCardAction retorna fail NOT_FOUND para um cartão inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("user-card-4"));
      const result = await updateCardAction({ cardId: "cartao-inexistente", title: "Novo título" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });
  });

  describe("moveCardAction / markResolvedAction / convertToFlashcardAction / convertToStudyTaskAction", () => {
    it("retorna fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);

      const moveResult = await moveCardAction({ cardId: "c1", toColumnId: "col1", toIndex: 0 });
      expect(moveResult.ok).toBe(false);
      if (!moveResult.ok) expect(moveResult.error.code).toBe("UNAUTHENTICATED");

      const resolveResult = await markResolvedAction({ cardId: "c1" });
      expect(resolveResult.ok).toBe(false);
      if (!resolveResult.ok) expect(resolveResult.error.code).toBe("UNAUTHENTICATED");

      const flashcardResult = await convertToFlashcardAction({ cardId: "c1" });
      expect(flashcardResult.ok).toBe(false);
      if (!flashcardResult.ok) expect(flashcardResult.error.code).toBe("UNAUTHENTICATED");

      const studyTaskResult = await convertToStudyTaskAction({ cardId: "c1" });
      expect(studyTaskResult.ok).toBe(false);
      if (!studyTaskResult.ok) expect(studyTaskResult.error.code).toBe("UNAUTHENTICATED");
    });

    it("retorna fail VALIDATION_ERROR com payload malformado (toIndex negativo)", async () => {
      authMock.mockResolvedValue(fakeSession("user-move-invalid"));
      const result = await moveCardAction({ cardId: "c1", toColumnId: "col1", toIndex: -1 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("moveCardAction retorna fail NOT_FOUND ao mover um cartão inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("user-move-nf"));
      const result = await moveCardAction({ cardId: "cartao-inexistente", toColumnId: "col-x", toIndex: 0 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });

    it("markResolvedAction/convertToFlashcardAction/convertToStudyTaskAction retornam fail NOT_FOUND para cartão inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("user-nf-conversions"));

      const resolveResult = await markResolvedAction({ cardId: "cartao-inexistente" });
      expect(resolveResult.ok).toBe(false);
      if (!resolveResult.ok) expect(resolveResult.error.code).toBe("NOT_FOUND");

      const flashcardResult = await convertToFlashcardAction({ cardId: "cartao-inexistente" });
      expect(flashcardResult.ok).toBe(false);
      if (!flashcardResult.ok) expect(flashcardResult.error.code).toBe("NOT_FOUND");

      const studyTaskResult = await convertToStudyTaskAction({ cardId: "cartao-inexistente" });
      expect(studyTaskResult.ok).toBe(false);
      if (!studyTaskResult.ok) expect(studyTaskResult.error.code).toBe("NOT_FOUND");
    });
  });

  describe("fluxo completo", () => {
    it("cria quadro, cria cartão, atualiza, move, resolve, converte (flashcard + tarefa) e apaga", async () => {
      authMock.mockResolvedValue(fakeSession("user-flow-1"));
      const board = await createBoardAction({ title: "Quadro fluxo" });
      expect(board.ok).toBe(true);
      if (!board.ok) return;
      const ideias = board.data.columns.find((c) => c.title === "Ideias")!.id;
      const estudar = board.data.columns.find((c) => c.title === "Estudar")!.id;

      const created = await createCardAction({ columnId: ideias, title: "Ideia inicial", type: "IDEIA" });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const updated = await updateCardAction({ cardId: created.data.id, title: "Ideia atualizada" });
      expect(updated.ok).toBe(true);
      if (updated.ok) expect(updated.data.title).toBe("Ideia atualizada");

      const moved = await moveCardAction({ cardId: created.data.id, toColumnId: estudar, toIndex: 0 });
      expect(moved.ok).toBe(true);
      if (moved.ok) expect(moved.data.columnId).toBe(estudar);

      const resolved = await markResolvedAction({ cardId: created.data.id });
      expect(resolved.ok).toBe(true);
      if (resolved.ok) expect(resolved.data.resolvido).toBe(true);

      const convertedTask = await convertToStudyTaskAction({ cardId: created.data.id });
      expect(convertedTask.ok).toBe(true);
      if (convertedTask.ok) expect(convertedTask.data.convertedStudyPlanItemId).not.toBeNull();

      const convertedFlashcard = await convertToFlashcardAction({ cardId: created.data.id });
      expect(convertedFlashcard.ok).toBe(true);
      if (convertedFlashcard.ok) expect(convertedFlashcard.data.convertedFlashcardId).not.toBeNull();

      const deleted = await deleteCardAction({ cardId: created.data.id });
      expect(deleted.ok).toBe(true);
      if (deleted.ok) expect(deleted.data.cardId).toBe(created.data.id);

      const afterDelete = await getBoardAction({ boardId: board.data.id });
      expect(afterDelete.ok).toBe(true);
      if (afterDelete.ok) {
        const resolvedColumn = afterDelete.data.columns.find((c) => c.title === "Resolvido")!;
        expect(resolvedColumn.cards).toEqual([]);
      }
    });
  });
});
