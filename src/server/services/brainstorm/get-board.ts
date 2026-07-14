import type { BrainstormBoardDTO } from "@/contracts/brainstorm";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import { toBrainstormBoardDTO } from "./mappers";
import { loadOwnedBoard } from "./shared";

/**
 * Lê um quadro de Brainstorm do usuário autenticado, com colunas e cartões já ordenados.
 * Autorização (ADR-0006): `requireUser` + `assertOwnership` + `loadOwnedBoard` (anti-IDOR —
 * quadro de outro usuário sempre 404, nunca 403, ver `@/server/services/brainstorm/shared.ts`).
 */
export async function getBoard(userId: string, boardId: string): Promise<BrainstormBoardDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const board = await loadOwnedBoard(userId, boardId);
  const repos = getRepositories();
  const columns = await repos.brainstormColumns.listByBoardId(board.id);
  const cards = await repos.brainstormCards.listByColumnIds(columns.map((column) => column.id));

  return toBrainstormBoardDTO(board, columns, cards);
}
