import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface XpBadgeProps {
  value: number;
  className?: string;
}

/**
 * Selo de XP discreto (CLAUDE.md §21: "utilizar discretamente XP..."). Exibição
 * apenas — o valor de XP definitivo é calculado e persistido pelo backend/gamification.
 */
export function XpBadge({ value, className }: XpBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("border-primary/40 bg-primary/10 text-primary gap-1 font-semibold", className)}
    >
      <Zap className="h-3 w-3" aria-hidden="true" />
      <span>{value.toLocaleString("pt-BR")} XP</span>
    </Badge>
  );
}
