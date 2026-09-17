import { inRepositoryTransaction } from "@/server/repositories/transaction";
import { BRAINSTORM_DEFAULT_COLUMNS } from "@/config/business";
import type { BrainstormBoardDTO, CreateBoardInput } from "@/contracts/brainstorm";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import { toBrainstormBoardDTO } from "./mappers";

/**
 * Cria um quadro de Brainstorm para o usuário autenticado, já com as 5 colunas padrão
 * (CLAUDE.md §20): Ideias, Estudar, Revisar, Dúvidas, Resolvido — nesta ordem
 * (`BRAINSTORM_DEFAULT_COLUMNS`, `@/config/business`). Autorização (ADR-0006): `requireUser` +
 * `assertOwnership`.
 */
async function createBoardInTransaction(
  userId: string,
  input: CreateBoardInput,
  now: Date = new Date(),
): Promise<BrainstormBoardDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const board = await repos.brainstormBoards.create({ userId, title: input.title, now });
  const columns = await repos.brainstormColumns.createMany(
    BRAINSTORM_DEFAULT_COLUMNS.map((name, index) => ({
      boardId: board.id,
      name,
      order: index,
      now,
    })),
  );

  await auditLog({
    operation: "brainstorm.create-board",
    userId,
    entity: "BrainstormBoard",
    entityId: board.id,
    result: "success",
    correlationId: board.id,
    metadata: { columnCount: columns.length },
  });

  return toBrainstormBoardDTO(board, columns, []);
}

export async function createBoard(...args: Parameters<typeof createBoardInTransaction>): ReturnType<typeof createBoardInTransaction> {
  return inRepositoryTransaction(() => createBoardInTransaction(...args));
}
