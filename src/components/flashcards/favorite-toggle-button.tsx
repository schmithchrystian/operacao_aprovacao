"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "@/server/actions/flashcards";

interface FlashcardFavoriteToggleButtonProps {
  flashcardId: string;
  initialFavorite: boolean;
  size?: "icon-sm" | "sm";
  className?: string;
}

/**
 * Alterna o favorito de um flashcard (Client Component — `useTransition` + estado otimista
 * revertido em falha, mesmo padrão de `@/components/simulations/favorite-toggle-button.tsx`).
 * Mantido como componente PRÓPRIO deste domínio (chama `toggleFavoriteAction({ flashcardId })`,
 * de `@/server/actions/flashcards` — ação e campo de entrada diferentes do de simulados,
 * `{ questionId }`) em vez de generalizar o componente de simulações, fora do escopo desta fase
 * (CLAUDE.md §6, "não alterar arquivos não relacionados à tarefa").
 */
export function FlashcardFavoriteToggleButton({
  flashcardId,
  initialFavorite,
  size = "icon-sm",
  className,
}: FlashcardFavoriteToggleButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const previous = isFavorite;
    setIsFavorite(!previous);

    startTransition(async () => {
      const result = await toggleFavoriteAction({ flashcardId });

      if (!result.ok) {
        setIsFavorite(previous);
        toast.error(result.error.message);
        return;
      }

      setIsFavorite(result.data.isFavorite);
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      disabled={isPending}
      onClick={handleClick}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={cn("text-muted-foreground hover:text-primary", isFavorite && "text-primary", className)}
    >
      <Star className={cn("h-4 w-4", isFavorite && "fill-current")} aria-hidden="true" />
    </Button>
  );
}
