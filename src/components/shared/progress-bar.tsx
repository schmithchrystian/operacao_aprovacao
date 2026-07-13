import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ProgressBarVariant = "default" | "success" | "danger";

interface ProgressBarProps {
  /** Percentual (0-100). Valores fora do intervalo são limitados (clamp). */
  value: number;
  label?: string;
  showValue?: boolean;
  variant?: ProgressBarVariant;
  className?: string;
}

/**
 * Seleciona a cor do indicador via `data-slot` (o Progress do shadcn/Base UI não
 * expõe prop de cor) — verde para progresso/acerto, vermelho para erro/alerta,
 * amarelo (primary) como padrão (CLAUDE.md §21).
 */
const INDICATOR_VARIANT_CLASS: Record<ProgressBarVariant, string> = {
  default: "",
  success: "[&_[data-slot=progress-indicator]]:bg-success",
  danger: "[&_[data-slot=progress-indicator]]:bg-destructive",
};

/**
 * Barra de progresso com rótulo e percentual opcionais. Exibição apenas —
 * o valor definitivo de progresso/tempo válido vem sempre do backend (CLAUDE.md §14).
 */
export function ProgressBar({ value, label, showValue = true, variant = "default", className }: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("space-y-1.5", className)}>
      {label || showValue ? (
        <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
          {label ? <span>{label}</span> : <span />}
          {showValue ? <span>{Math.round(safeValue)}%</span> : null}
        </div>
      ) : null}
      <Progress value={safeValue} className={INDICATOR_VARIANT_CLASS[variant]} aria-label={label ?? "Progresso"} />
    </div>
  );
}
