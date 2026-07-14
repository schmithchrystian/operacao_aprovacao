import type { BrainstormBoardSummaryDTO } from "@/contracts/brainstorm";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";

/**
 * Lista os quadros de Brainstorm do usuário autenticado — resumo (sem cartões, ver
 * `BrainstormBoardSummaryDTO`) para uma listagem/seletor leve; o quadro completo é `getBoard`.
 * Autorização (ADR-0006): `requireUser` + `assertOwnership`.
 */
export async function listBoards(userId: string): Promise<BrainstormBoardSummaryDTO[]> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const boards = await repos.brainstormBoards.listByUserId(userId);

  return Promise.all(
    boards.map(async (board): Promise<BrainstormBoardSummaryDTO> => {
      const columns = await repos.brainstormColumns.listByBoardId(board.id);
      const cards = await repos.brainstormCards.listByColumnIds(columns.map((column) => column.id));
      return {
        id: board.id,
        title: board.title,
        columnCount: columns.length,
        cardCount: cards.length,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      };
    }),
  );
}
