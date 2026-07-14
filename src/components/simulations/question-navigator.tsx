"use client";

import { cn } from "@/lib/utils";

interface QuestionNavigatorItem {
  questionId: string;
  answered: boolean;
  flagged: boolean;
}

interface QuestionNavigatorProps {
  items: QuestionNavigatorItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Grade de navegação entre questões (Client Component — estado de posição/resposta vive em
 * `AttemptRunner`, este componente só exibe e emite `onSelect`). Botões nativos: focáveis e
 * ativáveis por teclado sem nenhum handler customizado de tecla.
 */
export function QuestionNavigator({ items, currentIndex, onSelect }: QuestionNavigatorProps) {
  return (
    <div role="group" aria-label="Navegar entre questões" className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
      {items.map((item, index) => {
        const isCurrent = index === currentIndex;
        return (
          <button
            key={item.questionId}
            type="button"
            onClick={() => onSelect(index)}
            aria-current={isCurrent ? "true" : undefined}
            aria-label={`Questão ${index + 1}${item.answered ? ", respondida" : ", não respondida"}${item.flagged ? ", marcada para revisar" : ""}`}
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              isCurrent ? "border-primary ring-primary/40 ring-2" : "border-border",
              item.answered
                ? "bg-success/10 text-success border-success/40"
                : "bg-muted text-muted-foreground",
            )}
          >
            {index + 1}
            {item.flagged ? (
              <span
                className="bg-primary absolute -top-1 -right-1 h-2 w-2 rounded-full"
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
