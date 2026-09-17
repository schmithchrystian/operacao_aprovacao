import { inRepositoryTransaction } from "@/server/repositories/transaction";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import { loadOwnedCard } from "./shared";

/**
 * Remove um cartão e recompacta a ordem dos cartões restantes na mesma coluna (sem buracos).
 * Autorização (ADR-0006): `requireUser` + `assertOwnership` + `loadOwnedCard` (anti-IDOR).
 */
async function deleteCardInTransaction(userId: string, cardId: string, now: Date = new Date()): Promise<void> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const { column, card } = await loadOwnedCard(userId, cardId);
  const repos = getRepositories();

  await repos.brainstormCards.delete(card.id);

  const remainingIds = (await repos.brainstormCards.listByColumnIds([column.id])).map((remaining) => remaining.id);
  await repos.brainstormCards.reorderColumn(column.id, remainingIds, now);

  await auditLog({
    operation: "brainstorm.delete-card",
    userId,
    entity: "BrainstormCard",
    entityId: card.id,
    result: "success",
    correlationId: card.id,
    metadata: { columnId: column.id },
  });
}

export async function deleteCard(...args: Parameters<typeof deleteCardInTransaction>): ReturnType<typeof deleteCardInTransaction> {
  return inRepositoryTransaction(() => deleteCardInTransaction(...args));
}
