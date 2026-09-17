import { inRepositoryTransaction } from "@/server/repositories/transaction";
import { BRAINSTORM_RESOLVED_COLUMN_TITLE } from "@/config/business";
import type { BrainstormCardDTO } from "@/contracts/brainstorm";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toBrainstormCardDTO } from "./mappers";
import { applyMove } from "./move-card";
import { loadOwnedCard } from "./shared";

/**
 * Marca um cartão como resolvido: move-o para a coluna "Resolvido" do quadro (ao final dela).
 * NÃO altera `status` (independente da coluna — docs/DATA-MODEL.md). IDEMPOTENTE: se o cartão
 * já está na coluna "Resolvido", devolve o estado atual sem nenhuma escrita.
 *
 * Autorização (ADR-0006): `requireUser` + `assertOwnership` + `loadOwnedCard` (anti-IDOR).
 */
async function markResolvedInTransaction(userId: string, cardId: string, now: Date = new Date()): Promise<BrainstormCardDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const { board, column: sourceColumn, card } = await loadOwnedCard(userId, cardId);
  const repos = getRepositories();

  const columns = await repos.brainstormColumns.listByBoardId(board.id);
  const resolvedColumn = columns.find((column) => column.name === BRAINSTORM_RESOLVED_COLUMN_TITLE);
  if (!resolvedColumn) {
    // Não deveria ocorrer para quadros criados por `createBoard` (sempre gera as 5 colunas
    // padrão) — defensivo mesmo assim, já que não há operação de excluir coluna nesta fase.
    throw new NotFoundError('Coluna "Resolvido" não encontrada neste quadro.');
  }

  if (card.columnId === resolvedColumn.id) {
    return toBrainstormCardDTO(card, resolvedColumn.name); // já resolvido — idempotente.
  }

  const destinationCards = await repos.brainstormCards.listByColumnIds([resolvedColumn.id]);
  const moved = await applyMove(card, sourceColumn, resolvedColumn, destinationCards.length, now);

  await auditLog({
    operation: "brainstorm.mark-resolved",
    userId,
    entity: "BrainstormCard",
    entityId: card.id,
    result: "success",
    correlationId: card.id,
    metadata: { fromColumnId: sourceColumn.id, resolvedColumnId: resolvedColumn.id },
  });

  return toBrainstormCardDTO(moved, resolvedColumn.name);
}

export async function markResolved(...args: Parameters<typeof markResolvedInTransaction>): ReturnType<typeof markResolvedInTransaction> {
  return inRepositoryTransaction(() => markResolvedInTransaction(...args));
}
