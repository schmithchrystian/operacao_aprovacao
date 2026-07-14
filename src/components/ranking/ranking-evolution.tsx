import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface RankingEvolutionProps {
  /** Delta de posição vs. a versão anterior do mesmo escopo/período (positivo = subiu). */
  value: number;
  className?: string;
}

/**
 * Indicador de evolução de posição no ranking. Nunca depende só da cor (CLAUDE.md/acessibilidade):
 * ícone + texto curto visível + descrição completa para leitor de tela.
 * Server Component — só formata um número já calculado pelo backend.
 */
export function RankingEvolution({ value, className }: RankingEvolutionProps) {
  const isUp = value > 0;
  const isDown = value < 0;
  const absValue = Math.abs(value);

  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  const colorClass = isUp ? "text-success" : isDown ? "text-destructive" : "text-muted-foreground";
  const shortText = isUp ? `+${value}` : isDown ? `${value}` : "0";
  const fullLabel = isUp
    ? `Subiu ${absValue} ${absValue === 1 ? "posição" : "posições"}`
    : isDown
      ? `Caiu ${absValue} ${absValue === 1 ? "posição" : "posições"}`
      : "Sem alteração de posição";

  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-medium", colorClass, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span aria-hidden="true">{shortText}</span>
      <span className="sr-only">{fullLabel}</span>
    </span>
  );
}
