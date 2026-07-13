import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardPerformanceSummary } from "@/contracts/dashboard";

interface PerformanceSummaryCardProps {
  summary: DashboardPerformanceSummary;
}

const TREND_CONFIG = {
  up: { icon: TrendingUp, label: "Em alta", className: "text-success" },
  down: { icon: TrendingDown, label: "Em queda", className: "text-destructive" },
  stable: { icon: Minus, label: "Estável", className: "text-muted-foreground" },
} as const;

/**
 * Resumo textual de desempenho recente. Server Component — apenas exibe o resumo
 * já pré-computado (Fase 8/12); nenhuma tendência é calculada aqui.
 */
export function PerformanceSummaryCard({ summary }: PerformanceSummaryCardProps) {
  const trend = TREND_CONFIG[summary.accuracyTrend];
  const TrendIcon = trend.icon;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Resumo de desempenho</CardTitle>
        <span className={cn("flex items-center gap-1 text-xs font-medium", trend.className)}>
          <TrendIcon className="h-4 w-4" aria-hidden="true" />
          {trend.label}
        </span>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-foreground text-sm">{summary.highlight}</p>
        <p className="text-muted-foreground text-xs">
          {summary.totalPointsThisWeek.toLocaleString("pt-BR")} pontos conquistados essa semana.
        </p>
      </CardContent>
    </Card>
  );
}
