import type { BrainstormCardDTO, MoveCardInput } from "@/contracts/brainstorm";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import type { BrainstormCardEntity } from "@/server/repositories/contracts/brainstorm-card-repository";
import type { BrainstormColumnEntity } from "@/server/repositories/contracts/brainstorm-column-repository";
import { toBrainstormCardDTO } from "./mappers";
import { clampIndex, loadOwnedCard, requireColumnOnBoard } from "./shared";

/**
 * Move um cartão (drag-and-drop) para `toColumnId` na posição `toIndex` — pode ser a mesma
 * coluna atual (reordenar dentro dela) ou outra coluna do MESMO quadro. Autorização
 * (ADR-0006): `requireUser` + `assertOwnership` + `loadOwnedCard`/`requireColumnOnBoard`
 * (anti-IDOR: a coluna destino precisa pertencer ao mesmo quadro do cartão, nunca a outro
 * quadro — nem do mesmo usuário, nem de outro).
 */
export async function moveCard(
  userId: string,
  input: MoveCardInput,
  now: Date = new Date(),
): Promise<BrainstormCardDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const { board, column: sourceColumn, card } = await loadOwnedCard(userId, input.cardId);
  const toColumn = await requireColumnOnBoard(board.id, input.toColumnId);

  const moved = await applyMove(card, sourceColumn, toColumn, input.toIndex, now);

  auditLog({
    operation: "brainstorm.move-card",
    userId,
    entity: "BrainstormCard",
    entityId: card.id,
    result: "success",
    correlationId: card.id,
    metadata: { fromColumnId: sourceColumn.id, toColumnId: toColumn.id, toIndex: input.toIndex },
  });

  return toBrainstormCardDTO(moved, toColumn.name);
}

/**
 * Núcleo da movimentação — persiste a posição final do cartão, recompactando a(s) coluna(s)
 * afetada(s). Compartilhado com `markResolved` (mover para a coluna "Resolvido" é, na prática,
 * o mesmo mecanismo com destino fixo, `@/server/services/brainstorm/mark-resolved.ts`). SEM
 * autorização própria — o chamador já deve ter resolvido/validado o dono via `loadOwnedCard`.
 *
 * IDEMPOTENTE: mover para a MESMA coluna, na MESMA posição final, não altera nada além de
 * `updatedAt` dos cartões cuja ordem realmente mudou (nenhum, nesse caso) — a garantia vem de
 * `BrainstormCardRepository.reorderColumn`.
 */
export async function applyMove(
  card: BrainstormCardEntity,
  sourceColumn: BrainstormColumnEntity,
  toColumn: BrainstormColumnEntity,
  toIndex: number,
  now: Date,
): Promise<BrainstormCardEntity> {
  const repos = getRepositories();

  if (sourceColumn.id === toColumn.id) {
    const currentIds = (await repos.brainstormCards.listByColumnIds([sourceColumn.id])).map((c) => c.id);
    const withoutCard = currentIds.filter((id) => id !== card.id);
    const finalIds = [...withoutCard];
    finalIds.splice(clampIndex(toIndex, withoutCard.length), 0, card.id);
    await repos.brainstormCards.reorderColumn(sourceColumn.id, finalIds, now);
  } else {
    const sourceIds = (await repos.brainstormCards.listByColumnIds([sourceColumn.id]))
      .map((c) => c.id)
      .filter((id) => id !== card.id);
    const destIds = (await repos.brainstormCards.listByColumnIds([toColumn.id])).map((c) => c.id);
    destIds.splice(clampIndex(toIndex, destIds.length), 0, card.id);

    // FK primeiro, ordem depois — quando `reorderColumn(toColumn.id, ...)` rodar, o cartão já
    // pertence a `toColumn` e é incluído na recompactação (ver contrato do repositório).
    await repos.brainstormCards.moveToColumn(card.id, toColumn.id, now);
    await repos.brainstormCards.reorderColumn(sourceColumn.id, sourceIds, now);
    await repos.brainstormCards.reorderColumn(toColumn.id, destIds, now);
  }

  const moved = await repos.brainstormCards.findById(card.id);
  if (!moved) {
    // Não deveria ocorrer — o cartão acabou de ser lido/atualizado acima.
    throw new NotFoundError("Cartão não encontrado após mover.");
  }
  return moved;
}
