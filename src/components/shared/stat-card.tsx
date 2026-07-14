import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
  /** Sobrescreve a cor padrão do valor/ícone (ex.: verde/vermelho para evolução de nota). */
  valueClassName?: string;
}

/**
 * Card de estatística genérico para dashboards (ex.: XP total, aulas concluídas).
 * Recebe os valores já calculados via props — não faz nenhum cálculo de negócio.
 */
export function StatCard({ title, value, icon: Icon, hint, className, valueClassName }: StatCardProps) {
  return (
    <Card className={cn("gap-2", className)}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-0">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
        {Icon ? <Icon className={cn("text-muted-foreground h-4 w-4", valueClassName)} aria-hidden="true" /> : null}
      </CardHeader>
      <CardContent>
        <p className={cn("text-2xl font-semibold tracking-tight", valueClassName)}>{value}</p>
        {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
