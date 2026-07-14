import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * `<select>` nativo estilizado — mesmo contrato visual usado em
 * `@/components/ranking/ranking-filters.tsx` (`SELECT_CLASS`), agora extraído para reuso pelo
 * formulário de montagem de simulado (várias selects: concurso/curso/matéria/assunto/dificuldade).
 * Não há um primitivo shadcn/Base UI de "Select" instalado neste projeto — um `<select>` nativo
 * é suficiente aqui (poucas opções, teclado e leitura por screen reader já nativos) e evita
 * introduzir uma dependência de UI só para este formulário.
 */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}
