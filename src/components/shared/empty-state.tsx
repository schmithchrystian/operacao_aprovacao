import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Estado vazio genérico (ex.: "em construção", listas sem itens).
 * Server Component — puramente apresentacional.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="border-border bg-card/40 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      {Icon ? (
        <span className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-full">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-foreground text-base font-semibold">{title}</p>
        {description ? <p className="text-muted-foreground max-w-sm text-sm">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
