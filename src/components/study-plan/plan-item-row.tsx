"use client";

import type { DragEvent } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudyPlanItemDTO } from "@/contracts/study-plan";
import {
  PLAN_ITEM_KIND_BADGE_VARIANT,
  PLAN_ITEM_KIND_ICON,
  PLAN_ITEM_KIND_LABEL,
  PLAN_ITEM_STATUS_BADGE_CLASS,
  PLAN_ITEM_STATUS_LABEL,
} from "./labels";

interface PlanItemRowProps {
  item: StudyPlanItemDTO;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  isDragOver: boolean;
  onToggleDone: (nextDone: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (event: DragEvent<HTMLLIElement>) => void;
  onDragOver: (event: DragEvent<HTMLLIElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLLIElement>) => void;
  onDragEnd: () => void;
}

/**
 * Uma linha de item do plano de estudos — reordenável por drag-and-drop nativo (HTML5) OU pelos
 * botões mover para cima/baixo (fallback de teclado/acessibilidade, sempre presentes e
 * funcionais mesmo sem suporte a arrastar). "Concluído" é a única mudança de status editável
 * aqui (`updatePlanItemAction`, via `onToggleDone`) — os demais status (`IN_PROGRESS`/`SKIPPED`)
 * só são exibidos, nunca calculados no cliente.
 *
 * Layout EMPILHADO (não uma única linha horizontal): o card do dia no calendário semanal é
 * estreito (~170-220px) — colocar grip+checkbox+título+minutos+botões todos numa única linha
 * deixava quase nenhuma largura para o título (uma primeira versão espremia "Estudar" em uma
 * letra por linha). Título e matéria ganham sua PRÓPRIA linha de largura cheia; controles ficam
 * em linhas compactas acima/abaixo.
 */
export function PlanItemRow({
  item,
  isFirst,
  isLast,
  disabled,
  isDragOver,
  onToggleDone,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: PlanItemRowProps) {
  const KindIcon = PLAN_ITEM_KIND_ICON[item.kind];
  const isDone = item.status === "DONE";
  const secondaryText = [item.subjectName, item.topicName].filter(Boolean).join(" — ");

  return (
    <li
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      aria-roledescription="item reordenável"
      className={cn(
        "border-border bg-card space-y-1.5 rounded-lg border p-2.5 transition-colors",
        isDragOver && "border-primary border-dashed",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="text-muted-foreground cursor-grab active:cursor-grabbing"
            aria-hidden="true"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
          <label className="flex items-center">
            <span className="sr-only">Marcar &quot;{item.title}&quot; como concluído</span>
            <input
              type="checkbox"
              className="accent-success h-4 w-4"
              checked={isDone}
              disabled={disabled}
              onChange={(event) => onToggleDone(event.target.checked)}
            />
          </label>
          <Badge variant={PLAN_ITEM_KIND_BADGE_VARIANT[item.kind]} className="gap-1">
            <KindIcon className="h-3 w-3" aria-hidden="true" />
            {PLAN_ITEM_KIND_LABEL[item.kind]}
          </Badge>
        </div>
        {item.estimatedMinutes !== null ? (
          <span className="text-muted-foreground shrink-0 text-xs font-medium tabular-nums">
            {item.estimatedMinutes} min
          </span>
        ) : null}
      </div>

      <p
        className={cn(
          "text-foreground text-sm font-medium break-words",
          isDone && "text-muted-foreground line-through",
        )}
      >
        {item.title}
      </p>
      {secondaryText ? (
        <p className="text-muted-foreground text-xs break-words">{secondaryText}</p>
      ) : null}

      <div className="flex items-center justify-between gap-1.5">
        {item.status !== "PENDING" ? (
          <Badge
            variant="outline"
            className={cn("text-[0.7rem]", PLAN_ITEM_STATUS_BADGE_CLASS[item.status])}
          >
            {PLAN_ITEM_STATUS_LABEL[item.status]}
          </Badge>
        ) : (
          <span />
        )}
        <div className="flex gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled || isFirst}
            onClick={onMoveUp}
            aria-label={`Mover "${item.title}" para cima`}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled || isLast}
            onClick={onMoveDown}
            aria-label={`Mover "${item.title}" para baixo`}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
        </div>
      </div>
    </li>
  );
}
