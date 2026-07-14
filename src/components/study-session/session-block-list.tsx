import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GeneratedSessionBlockDTO } from "@/contracts/study-session";
import { CONTENT_TYPE_ICON } from "./content-type-icon";

interface SessionBlockListProps {
  blocks: GeneratedSessionBlockDTO[];
  /** Índice (0-based) do bloco em execução — destaca visualmente a missão em andamento. */
  currentBlockIndex?: number;
}

/**
 * Lista de blocos de uma sessão gerada (tipo/ícone, título e minutos) — Server-safe
 * (puramente apresentacional). Reusada tanto no preview de "Montar estudo" quanto na
 * confirmação de missão iniciada; nenhum cálculo de minutos acontece aqui, os valores já vêm
 * prontos de `GeneratedSessionDTO`/`StudyMissionDTO` (CLAUDE.md — alocação é sempre do servidor).
 */
export function SessionBlockList({ blocks, currentBlockIndex }: SessionBlockListProps) {
  return (
    <ol className="space-y-2">
      {blocks.map((block, index) => {
        const Icon = CONTENT_TYPE_ICON[block.type];
        const isCurrent = currentBlockIndex === index;

        return (
          <li
            key={`${block.type}-${index}`}
            className={cn(
              "border-border flex items-start gap-3 rounded-lg border p-3",
              isCurrent && "border-primary bg-primary/5",
            )}
          >
            <span
              className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{block.label}</Badge>
                {isCurrent ? <Badge>Bloco atual</Badge> : null}
              </div>
              <p className="text-foreground text-sm font-medium break-words">{block.title}</p>
            </div>
            <span className="text-muted-foreground shrink-0 text-sm font-medium tabular-nums">
              {block.minutes} min
            </span>
          </li>
        );
      })}
    </ol>
  );
}
