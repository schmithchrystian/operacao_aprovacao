"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BRAINSTORM_RESOLVED_COLUMN_TITLE } from "@/config/business";
import type { BrainstormBoardDTO, BrainstormCardDTO, BrainstormColumnDTO } from "@/contracts/brainstorm";
import type { SubjectOptionDTO } from "@/contracts/simulations";
import {
  convertToFlashcardAction,
  convertToStudyTaskAction,
  deleteCardAction,
  getBoardAction,
  markResolvedAction,
  moveCardAction,
} from "@/server/actions/brainstorm";
import { CardFormDialog, type CardFormTarget } from "./card-form-dialog";
import { KanbanColumn } from "./kanban-column";
import { moveCardOptimistically } from "./optimistic-move";

interface KanbanBoardProps {
  board: BrainstormBoardDTO;
  subjects: SubjectOptionDTO[];
  onBoardChanged: (board: BrainstormBoardDTO) => void;
}

interface DragSource {
  columnId: string;
  cardId: string;
  index: number;
}

interface DragOverTarget {
  columnId: string;
  index: number;
}

function adjacentColumnRef(
  columns: readonly BrainstormColumnDTO[],
  index: number,
): { id: string; title: string } | null {
  const column = columns[index];
  return column ? { id: column.id, title: column.title } : null;
}

function removeCardFromBoard(board: BrainstormBoardDTO, card: BrainstormCardDTO): BrainstormBoardDTO {
  return {
    ...board,
    columns: board.columns.map((column) =>
      column.id === card.columnId
        ? {
            ...column,
            cards: column.cards.filter((c) => c.id !== card.id).map((c, index) => ({ ...c, order: index })),
          }
        : column,
    ),
  };
}

/**
 * Quadro Kanban do Brainstorm (Fase 13 — UI do agente `frontend`, CLAUDE.md §20). Client
 * Component: recebe o `BrainstormBoardDTO` já resolvido do servidor (via `BrainstormWorkspace`) e
 * passa a possuir esse estado no cliente — mesmo padrão de `StudyPlanCalendar`
 * (`@/components/study-plan/study-plan-calendar.tsx`).
 *
 * Toda mutação (mover, marcar resolvido, converter, excluir) aplica um estado OTIMISTA local
 * (`moveCardOptimistically`/remoção direta) para feedback imediato e, no sucesso, busca o board
 * inteiro de novo via `getBoardAction` — nunca trata o recálculo local como definitivo (CLAUDE.md:
 * "não calcule... como fonte definitiva"). Em caso de falha, reverte para o board anterior e
 * mostra o erro via `sonner`.
 */
export function KanbanBoard({ board, subjects, onBoardChanged }: KanbanBoardProps) {
  const [isMutating, startMutating] = useTransition();
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<DragOverTarget | null>(null);
  const [formState, setFormState] = useState<{ open: boolean; target: CardFormTarget | null }>({
    open: false,
    target: null,
  });
  const [cardPendingDelete, setCardPendingDelete] = useState<BrainstormCardDTO | null>(null);

  async function refreshBoard() {
    const result = await getBoardAction({ boardId: board.id });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    onBoardChanged(result.data);
  }

  function handleMove(cardId: string, toColumnId: string, toIndex: number) {
    const previousBoard = board;
    onBoardChanged(moveCardOptimistically(board, cardId, toColumnId, toIndex));

    startMutating(async () => {
      const result = await moveCardAction({ cardId, toColumnId, toIndex });
      if (!result.ok) {
        onBoardChanged(previousBoard);
        toast.error(result.error.message);
        return;
      }
      await refreshBoard();
    });
  }

  function handleDragStartCard(columnId: string, cardId: string, index: number) {
    setDragSource({ columnId, cardId, index });
  }

  function handleDragOverSlot(columnId: string, index: number) {
    if (!dragSource) return;
    setDragOverTarget({ columnId, index });
  }

  function handleDragLeaveSlot(columnId: string, index: number) {
    setDragOverTarget((current) => (current?.columnId === columnId && current.index === index ? null : current));
  }

  function handleDropSlot(columnId: string, index: number) {
    const source = dragSource;
    setDragSource(null);
    setDragOverTarget(null);
    if (!source) return;

    // Ao sair de uma posição ANTERIOR dentro da MESMA coluna, remover o cartão desloca os índices
    // seguintes uma posição para trás — ajusta para o índice continuar apontando para "antes do
    // cartão que hoje ocupa `index`" mesmo depois da remoção (mesma convenção de
    // `applyMove`/`toIndex`, `@/server/services/brainstorm/move-card.ts`).
    const adjustedIndex = source.columnId === columnId && source.index < index ? index - 1 : index;
    handleMove(source.cardId, columnId, adjustedIndex);
  }

  function handleDragEnd() {
    setDragSource(null);
    setDragOverTarget(null);
  }

  function handleMoveWithinColumn(cardId: string, direction: "up" | "down") {
    const column = board.columns.find((c) => c.cards.some((card) => card.id === cardId));
    if (!column) return;
    const index = column.cards.findIndex((card) => card.id === cardId);
    if (index === -1) return;
    const toIndex = direction === "up" ? index - 1 : index + 1;
    if (toIndex < 0 || toIndex >= column.cards.length) return;
    handleMove(cardId, column.id, toIndex);
  }

  function handleMoveToColumn(cardId: string, toColumnId: string) {
    const toColumn = board.columns.find((c) => c.id === toColumnId);
    if (!toColumn) return;
    handleMove(cardId, toColumnId, toColumn.cards.length);
  }

  function handleMarkResolved(card: BrainstormCardDTO) {
    if (card.resolvido) return;
    const resolvedColumn = board.columns.find((c) => c.title === BRAINSTORM_RESOLVED_COLUMN_TITLE);
    const previousBoard = board;
    if (resolvedColumn) {
      onBoardChanged(moveCardOptimistically(board, card.id, resolvedColumn.id, resolvedColumn.cards.length));
    }

    startMutating(async () => {
      const result = await markResolvedAction({ cardId: card.id });
      if (!result.ok) {
        onBoardChanged(previousBoard);
        toast.error(result.error.message);
        return;
      }
      toast.success("Cartão marcado como resolvido!");
      await refreshBoard();
    });
  }

  function handleConvertToFlashcard(card: BrainstormCardDTO) {
    if (card.convertedFlashcardId) return;
    startMutating(async () => {
      const result = await convertToFlashcardAction({ cardId: card.id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Cartão convertido em flashcard.");
      await refreshBoard();
    });
  }

  function handleConvertToStudyTask(card: BrainstormCardDTO) {
    if (card.convertedStudyPlanItemId) return;
    startMutating(async () => {
      const result = await convertToStudyTaskAction({ cardId: card.id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Cartão convertido em tarefa do plano de estudos.");
      await refreshBoard();
    });
  }

  function handleConfirmDelete() {
    const card = cardPendingDelete;
    if (!card) return;
    const previousBoard = board;
    onBoardChanged(removeCardFromBoard(board, card));
    setCardPendingDelete(null);

    startMutating(async () => {
      const result = await deleteCardAction({ cardId: card.id });
      if (!result.ok) {
        onBoardChanged(previousBoard);
        toast.error(result.error.message);
        return;
      }
      toast.success("Cartão excluído.");
      await refreshBoard();
    });
  }

  function openCreateDialog(columnId: string, columnTitle: string) {
    setFormState({ open: true, target: { mode: "create", columnId, columnTitle } });
  }

  function openEditDialog(card: BrainstormCardDTO) {
    setFormState({ open: true, target: { mode: "edit", card } });
  }

  function handleFormOpenChange(open: boolean) {
    setFormState((current) => ({ ...current, open }));
  }

  function handleCardSaved() {
    void refreshBoard();
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-2">
        <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3">
          {board.columns.map((column, columnIndex) => (
            <KanbanColumn
              key={column.id}
              column={column}
              previousColumn={adjacentColumnRef(board.columns, columnIndex - 1)}
              nextColumn={adjacentColumnRef(board.columns, columnIndex + 1)}
              disabled={isMutating}
              dragSource={dragSource}
              dragOverTarget={dragOverTarget}
              onDragStartCard={handleDragStartCard}
              onDragOverSlot={handleDragOverSlot}
              onDragLeaveSlot={handleDragLeaveSlot}
              onDropSlot={handleDropSlot}
              onDragEnd={handleDragEnd}
              onMoveWithinColumn={handleMoveWithinColumn}
              onMoveToColumn={handleMoveToColumn}
              onEditCard={openEditDialog}
              onRequestDeleteCard={setCardPendingDelete}
              onMarkResolved={handleMarkResolved}
              onConvertToFlashcard={handleConvertToFlashcard}
              onConvertToStudyTask={handleConvertToStudyTask}
              onAddCard={openCreateDialog}
            />
          ))}
        </div>
      </div>

      <CardFormDialog
        open={formState.open}
        onOpenChange={handleFormOpenChange}
        target={formState.target}
        subjects={subjects}
        onCreated={handleCardSaved}
        onUpdated={handleCardSaved}
      />

      <Dialog open={cardPendingDelete !== null} onOpenChange={(open) => !open && setCardPendingDelete(null)}>
        <DialogContent aria-describedby="delete-card-dialog-description">
          <DialogHeader>
            <DialogTitle>Excluir cartão?</DialogTitle>
            <DialogDescription id="delete-card-dialog-description">
              {cardPendingDelete
                ? `Tem certeza que deseja excluir "${cardPendingDelete.title}"? Essa ação não pode ser desfeita.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCardPendingDelete(null)} disabled={isMutating}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDelete} disabled={isMutating}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
