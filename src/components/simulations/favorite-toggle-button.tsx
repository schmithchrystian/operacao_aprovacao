"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "@/server/actions/simulations";

interface FavoriteToggleButtonProps {
  questionId: string;
  initialFavorite: boolean;
  /** Chamado após alternar com sucesso — usado pelas listas (favoritos/caderno de erros) para
   *  remover o item da tela sem esperar um `router.refresh()` completo. */
  onToggled?: (isFavorite: boolean) => void;
  size?: "icon-sm" | "sm";
  className?: string;
}

/**
 * Alterna o favorito de uma questão (Client Component — mesmo padrão de `EnrollButton`:
 * `useTransition` + `sonner`). Reusado na resolução do simulado, no caderno de erros e na
 * listagem de favoritos. O estado otimista é só visual — `toggleFavoriteAction` é a única fonte
 * de verdade (se falhar, reverte).
 */
export function FavoriteToggleButton({
  questionId,
  initialFavorite,
  onToggled,
  size = "icon-sm",
  className,
}: FavoriteToggleButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const previous = isFavorite;
    setIsFavorite(!previous);

    startTransition(async () => {
      const result = await toggleFavoriteAction({ questionId });

      if (!result.ok) {
        setIsFavorite(previous);
        toast.error(result.error.message);
        return;
      }

      setIsFavorite(result.data.isFavorite);
      onToggled?.(result.data.isFavorite);
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
