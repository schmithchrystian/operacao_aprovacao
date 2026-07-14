"use client";

import type { DragEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { BrainstormCardDTO } from "@/contracts/brainstorm";
import {
  CARD_PRIORITY_BADGE_CLASS,
  CARD_PRIORITY_LABEL,
  CARD_STATUS_LABEL,
  CARD_TYPE_BADGE_CLASS,
  CARD_TYPE_ICON,
  CARD_TYPE_LABEL,
  FLASHCARD_CONVERSION_ICON,
  RESOLVED_BADGE_CLASS,
  RESOLVED_ICON,
  STUDY_TASK_CONVERSION_ICON,
} from "./labels";

interface AdjacentColumn {
  id: string;
  title: string;
}

interface KanbanCardProps {
  card: BrainstormCardDTO;
  isFirst: boolean;
  isLast: boolean;
  previousColumn: AdjacentColumn | null;
  nextColumn: AdjacentColumn | null;
  disabled: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (event: DragEvent<HTMLLIElement>) => void;
  onDragOver: (event: DragEvent<HTMLLIElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLLIElement>) => void;
  onDragEnd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToColumn: (columnId: string) => void;
  onEdit: () => void;
  onRequestDelete: () => void;
  onMarkResolved: () => void;
  onConvertToFlashcard: () => void;
  onConvertToStudyTask: () => void;
}

/**
 * Um cartão do quadro de Brainstorm (Fase 13 — UI do agente `frontend`) — arrastável via HTML5
 * nativo (dragstart/dragover/drop, orquestrado por `KanbanBoard`/`KanbanColumn`) E reordenável
 * pelos botões ◀▲▼▶ (fallback de teclado/acessibilidade, sempre presentes e funcionais mesmo sem
 * suporte a arrastar — mesmo padrão de `@/components/study-plan/plan-item-row.tsx`).
 *
 * Todo texto do cartão (título/conteúdo/tags) é renderizado como texto JSX comum — React escapa
 * automaticamente, nunca usar `dangerouslySetInnerHTML` aqui (CLAUDE.md/instruções da tarefa).
 */
export function KanbanCard({
  card,
  isFirst,
  isLast,
  previousColumn,
  nextColumn,
  disabled,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  onMoveToColumn,
  onEdit,
  onRequestDelete,
  onMarkResolved,
  onConvertToFlashcard,
  onConvertToStudyTask,
}: KanbanCardProps) {
  const TypeIcon = CARD_TYPE_ICON[card.type];
  const secondaryText = [card.subjectName, card.topicName].filter(Boolean).join(" — ");
  const isFlashcardConverted = Boolean(card.convertedFlashcardId);
  const isStudyTaskConverted = Boolean(card.convertedStudyPlanItemId);
  // Vinculados a variáveis PascalCase antes do uso como tag JSX (react/jsx-pascal-case) — mesmo
  // padrão de `FALLBACK_ICON`/`ICON_ALLOWLIST` em `@/components/shared/lucide-icon.tsx`.
  const FlashcardIcon = FLASHCARD_CONVERSION_ICON;
  const StudyTaskIcon = STUDY_TASK_CONVERSION_ICON;
  const ResolvedIcon = RESOLVED_ICON;

  return (
    <li
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      aria-roledescription="cartão arrastável"
      className={cn(
        "border-border bg-card space-y-2 rounded-lg border p-2.5 transition-colors",
        isDragOver && "border-primary border-dashed",
        isDragging && "opacity-50",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className={cn("gap-1", CARD_TYPE_BADGE_CLASS[card.type])}>
            <TypeIcon className="h-3 w-3" aria-hidden="true" />
            {CARD_TYPE_LABEL[card.type]}
          </Badge>
          <Badge variant="outline" className={CARD_PRIORITY_BADGE_CLASS[card.priority]}>
            {CARD_PRIORITY_LABEL[card.priority]}
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={disabled}
                aria-label={`Mais ações do cartão "${card.title}"`}
              />
            }
          >
            <MoreVertical aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil aria-hidden="true" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onConvertToFlashcard} disabled={isFlashcardConverted}>
              <FlashcardIcon aria-hidden="true" />
              {isFlashcardConverted ? "Já é um flashcard" : "Virar flashcard"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onConvertToStudyTask} disabled={isStudyTaskConverted}>
              <StudyTaskIcon aria-hidden="true" />
              {isStudyTaskConverted ? "Já é tarefa de estudo" : "Virar tarefa de estudo"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onRequestDelete}>
              <Trash2 aria-hidden="true" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-foreground text-sm font-medium break-words">{card.title}</p>

      {card.content ? (
        <p className="text-muted-foreground line-clamp-3 text-xs break-words">{card.content}</p>
      ) : null}

      {card.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {card.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[0.65rem]">
              #{tag}
            </Badge>
          ))}
        </div>
      ) : null}

      {secondaryText ? <p className="text-muted-foreground text-xs break-words">{secondaryText}</p> : null}

      {isFlashcardConverted || isStudyTaskConverted || card.status === "ARCHIVED" ? (
        <div className="flex flex-wrap gap-1">
          {isFlashcardConverted ? (
            <Badge variant="outline" className="gap-1 text-[0.65rem]">
              <FlashcardIcon className="h-3 w-3" aria-hidden="true" />
              Virou flashcard
            </Badge>
          ) : null}
          {isStudyTaskConverted ? (
            <Badge variant="outline" className="gap-1 text-[0.65rem]">
              <StudyTaskIcon className="h-3 w-3" aria-hidden="true" />
              Virou tarefa de estudo
            </Badge>
          ) : null}
          {card.status === "ARCHIVED" ? (
            <Badge variant="outline" className="text-[0.65rem]">
              {CARD_STATUS_LABEL.ARCHIVED}
            </Badge>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-1.5 pt-1">
        <div className="flex gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled || !previousColumn}
            onClick={() => previousColumn && onMoveToColumn(previousColumn.id)}
            aria-label={
              previousColumn
                ? `Mover "${card.title}" para a coluna ${previousColumn.title}`
                : `"${card.title}" já está na primeira coluna`
            }
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled || isFirst}
            onClick={onMoveUp}
            aria-label={`Mover "${card.title}" para cima`}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled || isLast}
            onClick={onMoveDown}
            aria-label={`Mover "${card.title}" para baixo`}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled || !nextColumn}
            onClick={() => nextColumn && onMoveToColumn(nextColumn.id)}
            aria-label={
              nextColumn ? `Mover "${card.title}" para a coluna ${nextColumn.title}` : `"${card.title}" já está na última coluna`
            }
          >
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>

        {card.resolvido ? (
          <Badge variant="outline" className={cn("gap-1", RESOLVED_BADGE_CLASS)}>
            <ResolvedIcon className="h-3 w-3" aria-hidden="true" />
            Resolvido
          </Badge>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={disabled}
            onClick={onMarkResolved}
            aria-label={`Resolver "${card.title}"`}
            className="text-success hover:text-success gap-1"
          >
            <ResolvedIcon aria-hidden="true" />
            Resolver
          </Button>
        )}
      </div>
    </li>
  );
}
