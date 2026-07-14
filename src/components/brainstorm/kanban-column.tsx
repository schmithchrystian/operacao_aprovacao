"use client";

import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BRAINSTORM_RESOLVED_COLUMN_TITLE } from "@/config/business";
import type { BrainstormCardDTO, BrainstormColumnDTO } from "@/contracts/brainstorm";
import { KanbanCard } from "./kanban-card";

interface AdjacentColumn {
  id: string;
  title: string;
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

interface KanbanColumnProps {
  column: BrainstormColumnDTO;
  previousColumn: AdjacentColumn | null;
  nextColumn: AdjacentColumn | null;
  disabled: boolean;
  dragSource: DragSource | null;
  dragOverTarget: DragOverTarget | null;
  onDragStartCard: (columnId: string, cardId: string, index: number) => void;
  onDragOverSlot: (columnId: string, index: number) => void;
  onDragLeaveSlot: (columnId: string, index: number) => void;
  onDropSlot: (columnId: string, index: number) => void;
  onDragEnd: () => void;
  onMoveWithinColumn: (cardId: string, direction: "up" | "down") => void;
  onMoveToColumn: (cardId: string, toColumnId: string) => void;
  onEditCard: (card: BrainstormCardDTO) => void;
  onRequestDeleteCard: (card: BrainstormCardDTO) => void;
  onMarkResolved: (card: BrainstormCardDTO) => void;
  onConvertToFlashcard: (card: BrainstormCardDTO) => void;
  onConvertToStudyTask: (card: BrainstormCardDTO) => void;
  onAddCard: (columnId: string, columnTitle: string) => void;
}

/**
 * Uma coluna do quadro de Brainstorm (Fase 13 — UI do agente `frontend`) — cabeçalho (título +
 * contagem), lista de cartões arrastáveis e um botão "Adicionar cartão" no rodapé. A coluna
 * inteira também é uma zona de drop (abaixo do último cartão) para permitir soltar em colunas
 * vazias ou "depois do último cartão" sem precisar acertar exatamente um cartão existente.
 */
export function KanbanColumn({
  column,
  previousColumn,
  nextColumn,
  disabled,
  dragSource,
  dragOverTarget,
  onDragStartCard,
  onDragOverSlot,
  onDragLeaveSlot,
  onDropSlot,
  onDragEnd,
  onMoveWithinColumn,
  onMoveToColumn,
  onEditCard,
  onRequestDeleteCard,
  onMarkResolved,
  onConvertToFlashcard,
  onConvertToStudyTask,
  onAddCard,
}: KanbanColumnProps) {
  const isResolvedColumn = column.title === BRAINSTORM_RESOLVED_COLUMN_TITLE;
  const headingId = `brainstorm-column-heading-${column.id}`;
  const tailIndex = column.cards.length;
  const isTailDragTarget = dragOverTarget?.columnId === column.id && dragOverTarget.index === tailIndex;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex h-full min-h-64 flex-col gap-2 rounded-lg border p-2.5",
        isResolvedColumn ? "border-success/30 bg-success/5" : "border-border bg-card/40",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h3 id={headingId} className={cn("text-sm font-semibold", isResolvedColumn && "text-success")}>
          {column.title}
        </h3>
        <Badge variant="outline">{column.cards.length}</Badge>
      </div>

      <ul
        role="list"
        aria-label={`Cartões da coluna ${column.title}`}
        onDragOver={(event) => {
          if (!dragSource) return;
          event.preventDefault();
          onDragOverSlot(column.id, tailIndex);
        }}
        onDrop={(event) => {
          if (!dragSource) return;
          event.preventDefault();
          onDropSlot(column.id, tailIndex);
        }}
        className="flex min-h-16 flex-1 flex-col gap-2"
      >
        {column.cards.map((card, index) => (
          <KanbanCard
            key={card.id}
            card={card}
            isFirst={index === 0}
            isLast={index === column.cards.length - 1}
            previousColumn={previousColumn}
            nextColumn={nextColumn}
            disabled={disabled}
            isDragging={dragSource?.cardId === card.id}
            isDragOver={dragOverTarget?.columnId === column.id && dragOverTarget.index === index}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", card.id);
              onDragStartCard(column.id, card.id, index);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDragOverSlot(column.id, index);
            }}
            onDragLeave={() => onDragLeaveSlot(column.id, index)}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDropSlot(column.id, index);
            }}
            onDragEnd={onDragEnd}
            onMoveUp={() => onMoveWithinColumn(card.id, "up")}
            onMoveDown={() => onMoveWithinColumn(card.id, "down")}
            onMoveToColumn={(columnId) => onMoveToColumn(card.id, columnId)}
            onEdit={() => onEditCard(card)}
            onRequestDelete={() => onRequestDeleteCard(card)}
            onMarkResolved={() => onMarkResolved(card)}
            onConvertToFlashcard={() => onConvertToFlashcard(card)}
            onConvertToStudyTask={() => onConvertToStudyTask(card)}
          />
        ))}

        {column.cards.length === 0 ? (
          <li
            className={cn(
              "border-border/60 text-muted-foreground flex flex-1 items-center justify-center rounded-md border border-dashed p-4 text-center text-xs",
              isTailDragTarget && "border-primary bg-primary/5",
            )}
          >
            Nenhum cartão nesta coluna — arraste um cartão para cá.
          </li>
        ) : null}
      </ul>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-start"
        disabled={disabled}
        onClick={() => onAddCard(column.id, column.title)}
      >
        <Plus aria-hidden="true" />
        Adicionar cartão
      </Button>
    </section>
  );
}
