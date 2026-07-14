import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import type { BrainstormBoardEntity } from "@/server/repositories/contracts/brainstorm-board-repository";
import type { BrainstormCardEntity } from "@/server/repositories/contracts/brainstorm-card-repository";
import type { BrainstormColumnEntity } from "@/server/repositories/contracts/brainstorm-column-repository";

/**
 * Helpers de resolução/autorização compartilhados pelos serviços de Brainstorm (Fase 13) —
 * mesmo papel de `@/server/services/courses/shared.ts` para o domínio de cursos. Centraliza a
 * cadeia board → coluna → cartão para não duplicar o anti-IDOR em cada serviço.
 */

/**
 * Resolve um quadro garantindo que pertence a `userId` — lança `NotFoundError` (nunca
 * `ForbiddenError`) quando não existe ou pertence a outro usuário, para não confirmar a
 * existência de um quadro alheio (mesmo padrão anti-IDOR de
 * `@/server/services/study-plan/update-plan-item.ts`).
 */
export async function loadOwnedBoard(userId: string, boardId: string): Promise<BrainstormBoardEntity> {
  const repos = getRepositories();
  const board = await repos.brainstormBoards.findById(boardId);
  if (!board || board.userId !== userId) {
    throw new NotFoundError("Quadro não encontrado.");
  }
  return board;
}

/** Resolve uma coluna + o quadro dono, garantindo que o quadro pertence a `userId`. */
export async function loadOwnedColumn(
  userId: string,
  columnId: string,
): Promise<{ board: BrainstormBoardEntity; column: BrainstormColumnEntity }> {
  const repos = getRepositories();
  const column = await repos.brainstormColumns.findById(columnId);
  if (!column) {
    throw new NotFoundError("Coluna não encontrada.");
  }
  const board = await loadOwnedBoard(userId, column.boardId);
  return { board, column };
}

/** Resolve um cartão + coluna + quadro dono, garantindo que o quadro pertence a `userId`. */
export async function loadOwnedCard(
  userId: string,
  cardId: string,
): Promise<{ board: BrainstormBoardEntity; column: BrainstormColumnEntity; card: BrainstormCardEntity }> {
  const repos = getRepositories();
  const card = await repos.brainstormCards.findById(cardId);
  if (!card) {
    throw new NotFoundError("Cartão não encontrado.");
  }
  const { board, column } = await loadOwnedColumn(userId, card.columnId);
  return { board, column, card };
}

/** Garante que `columnId` é uma coluna real do quadro `boardId` — usado por `moveCard` para
 *  validar a coluna DESTINO (nunca aceitar mover um cartão para uma coluna de outro quadro). */
export async function requireColumnOnBoard(boardId: string, columnId: string): Promise<BrainstormColumnEntity> {
  const repos = getRepositories();
  const column = await repos.brainstormColumns.findById(columnId);
  if (!column || column.boardId !== boardId) {
    throw new NotFoundError("Coluna não encontrada.");
  }
  return column;
}

/** Ajusta um índice alvo de drag-and-drop para o intervalo válido `[0, length]` — nunca rejeita
 *  um índice fora do intervalo (ex.: `toIndex` levemente desatualizado por uma corrida de
 *  cliques rápidos), apenas o encosta no início/fim. */
export function clampIndex(index: number, length: number): number {
  if (index < 0) return 0;
  if (index > length) return length;
  return index;
}
