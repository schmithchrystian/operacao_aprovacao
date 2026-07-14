"use server";

import { fail, ok, type ActionResult } from "@/contracts/common";
import {
  boardIdInputSchema,
  cardIdInputSchema,
  createBoardInputSchema,
  createCardInputSchema,
  moveCardInputSchema,
  updateCardInputSchema,
  type BrainstormBoardDTO,
  type BrainstormBoardSummaryDTO,
  type BrainstormCardDTO,
} from "@/contracts/brainstorm";
import { requireUser } from "@/server/authorization";
import { isDomainError, ValidationError } from "@/server/errors";
import {
  convertToFlashcard,
  convertToStudyTask,
  createBoard,
  createCard,
  deleteCard,
  getBoard,
  listBoards,
  markResolved,
  moveCard,
  updateCard,
} from "@/server/services/brainstorm";
import { parseInput } from "@/server/validation";

/**
 * Server Actions finas (docs/ARCHITECTURE.md §6) do domínio "Brainstorm" (Fase 13 — agente
 * `backend`): resolvem o usuário autenticado a partir da sessão real do Auth.js (nunca de um
 * `userId` vindo do cliente), validam a entrada com Zod e repassam para o service. Mesmo padrão
 * de `@/server/actions/study-plan.ts`.
 */

function toActionError(error: unknown): ActionResult<never> {
  if (isDomainError(error)) {
    const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
    return fail(error.code, error.message, fieldErrors);
  }
  return fail("INTERNAL_ERROR", "Não foi possível processar a solicitação.");
}

/** Cria um novo quadro (com as 5 colunas padrão) para o aluno autenticado. */
export async function createBoardAction(rawInput: unknown): Promise<ActionResult<BrainstormBoardDTO>> {
  try {
    const input = parseInput(createBoardInputSchema, rawInput);
    const session = await requireUser();
    const board = await createBoard(session.userId, input);
    return ok(board);
  } catch (error) {
    return toActionError(error);
  }
}

/** Lista os quadros (resumo) do aluno autenticado. */
export async function listBoardsAction(): Promise<ActionResult<BrainstormBoardSummaryDTO[]>> {
  try {
    const session = await requireUser();
    const boards = await listBoards(session.userId);
    return ok(boards);
  } catch (error) {
    return toActionError(error);
  }
}

/** Lê um quadro completo (colunas + cartões ordenados) do aluno autenticado. */
export async function getBoardAction(rawInput: unknown): Promise<ActionResult<BrainstormBoardDTO>> {
  try {
    const input = parseInput(boardIdInputSchema, rawInput);
    const session = await requireUser();
    const board = await getBoard(session.userId, input.boardId);
    return ok(board);
  } catch (error) {
    return toActionError(error);
  }
}

/** Cria um cartão numa coluna do quadro do aluno autenticado. */
export async function createCardAction(rawInput: unknown): Promise<ActionResult<BrainstormCardDTO>> {
  try {
    const input = parseInput(createCardInputSchema, rawInput);
    const session = await requireUser();
    const card = await createCard(session.userId, input);
    return ok(card);
  } catch (error) {
    return toActionError(error);
  }
}

/** Atualiza o conteúdo de um cartão (título/conteúdo/tags/tipo/matéria/assunto/prioridade). */
export async function updateCardAction(rawInput: unknown): Promise<ActionResult<BrainstormCardDTO>> {
  try {
    const input = parseInput(updateCardInputSchema, rawInput);
    const session = await requireUser();
    const card = await updateCard(session.userId, input);
    return ok(card);
  } catch (error) {
    return toActionError(error);
  }
}

/** Remove um cartão (recompactando a ordem dos demais na mesma coluna). */
export async function deleteCardAction(rawInput: unknown): Promise<ActionResult<{ cardId: string }>> {
  try {
    const input = parseInput(cardIdInputSchema, rawInput);
    const session = await requireUser();
    await deleteCard(session.userId, input.cardId);
    return ok({ cardId: input.cardId });
  } catch (error) {
    return toActionError(error);
  }
}

/** Move um cartão (drag-and-drop) para outra posição/coluna do mesmo quadro. */
export async function moveCardAction(rawInput: unknown): Promise<ActionResult<BrainstormCardDTO>> {
  try {
    const input = parseInput(moveCardInputSchema, rawInput);
    const session = await requireUser();
    const card = await moveCard(session.userId, input);
    return ok(card);
  } catch (error) {
    return toActionError(error);
  }
}

/** Marca um cartão como resolvido (move para a coluna "Resolvido"). */
export async function markResolvedAction(rawInput: unknown): Promise<ActionResult<BrainstormCardDTO>> {
  try {
    const input = parseInput(cardIdInputSchema, rawInput);
    const session = await requireUser();
    const card = await markResolved(session.userId, input.cardId);
    return ok(card);
  } catch (error) {
    return toActionError(error);
  }
}

/** Converte um cartão em rascunho de flashcard (TODO Fase 14 para o repositório definitivo). */
export async function convertToFlashcardAction(rawInput: unknown): Promise<ActionResult<BrainstormCardDTO>> {
  try {
    const input = parseInput(cardIdInputSchema, rawInput);
    const session = await requireUser();
    const card = await convertToFlashcard(session.userId, input.cardId);
    return ok(card);
  } catch (error) {
    return toActionError(error);
  }
}

/** Converte um cartão em um item real do plano de estudos (Fase 11). */
export async function convertToStudyTaskAction(rawInput: unknown): Promise<ActionResult<BrainstormCardDTO>> {
  try {
    const input = parseInput(cardIdInputSchema, rawInput);
    const session = await requireUser();
    const card = await convertToStudyTask(session.userId, input.cardId);
    return ok(card);
  } catch (error) {
    return toActionError(error);
  }
}
