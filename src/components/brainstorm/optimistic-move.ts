import { BRAINSTORM_RESOLVED_COLUMN_TITLE } from "@/config/business";
import type { BrainstormBoardDTO } from "@/contracts/brainstorm";

/**
 * Recalcula o `BrainstormBoardDTO` localmente após mover um cartão — usado só para feedback
 * OTIMISTA imediato de drag-and-drop/botões de mover (Fase 13 — UI do agente `frontend`). NUNCA a
 * fonte definitiva: o board real, recompactado pelo servidor (`moveCardAction`/`markResolvedAction`),
 * sempre substitui este resultado logo em seguida via `getBoardAction` — mesmo padrão de
 * `doneOverrides`/`refreshPlan` em `@/components/study-plan/study-plan-calendar.tsx`, adaptado
 * para a estrutura de colunas do quadro.
 *
 * Função pura, mesmo estilo de `reorderDayItems` (`@/components/study-plan/reorder-day-items`):
 * não muta `board`, devolve sempre um novo objeto. `toIndex` é interpretado com a MESMA convenção
 * de `moveCardInputSchema`/`applyMove` (`@/server/services/brainstorm/move-card.ts`): posição no
 * array da coluna destino JÁ SEM o cartão movido — e é sempre clampado ao intervalo válido, nunca
 * lança para um índice fora dele. Também recalcula `resolvido` (derivado do título da coluna
 * destino) para a coluna refletir imediatamente o estado "Resolvido" sem esperar o refetch.
 */
export function moveCardOptimistically(
  board: BrainstormBoardDTO,
  cardId: string,
  toColumnId: string,
  toIndex: number,
): BrainstormBoardDTO {
  const sourceColumn = board.columns.find((column) => column.cards.some((card) => card.id === cardId));
  const card = sourceColumn?.cards.find((c) => c.id === cardId);
  const destinationExists = board.columns.some((column) => column.id === toColumnId);

  if (!sourceColumn || !card || !destinationExists) {
    return board;
  }

  return {
    ...board,
    columns: board.columns.map((column) => {
      const isSource = column.id === sourceColumn.id;
      const isDestination = column.id === toColumnId;
      const resolvido = column.title === BRAINSTORM_RESOLVED_COLUMN_TITLE;

      if (isSource && isDestination) {
        const withoutCard = column.cards.filter((c) => c.id !== cardId);
        const clampedIndex = Math.max(0, Math.min(toIndex, withoutCard.length));
        const nextCards = [...withoutCard];
        nextCards.splice(clampedIndex, 0, { ...card, columnId: toColumnId, resolvido });
        return { ...column, cards: nextCards.map((c, index) => ({ ...c, order: index })) };
      }

      if (isSource) {
        const remaining = column.cards.filter((c) => c.id !== cardId);
        return { ...column, cards: remaining.map((c, index) => ({ ...c, order: index })) };
      }

      if (isDestination) {
        const clampedIndex = Math.max(0, Math.min(toIndex, column.cards.length));
        const nextCards = [...column.cards];
        nextCards.splice(clampedIndex, 0, { ...card, columnId: toColumnId, resolvido });
        return { ...column, cards: nextCards.map((c, index) => ({ ...c, order: index })) };
      }

      return column;
    }),
  };
}
