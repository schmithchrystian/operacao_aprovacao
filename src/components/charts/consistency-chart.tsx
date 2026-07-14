"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrackingConsistencyDTO } from "@/contracts/tracking";

interface ConsistencyChartProps {
  data: TrackingConsistencyDTO;
}

/**
 * Gráfico de barra única "consistência de estudo" — percentual de dias com estudo válido numa
 * janela recente (`TrackingOverviewDTO.consistency`, ex.: últimos 30 dias). Mesmo padrão visual
 * de `SubjectPerformanceChart`/`AttemptPerformanceChart` (barra horizontal, eixo 0–100%), com
 * uma única categoria. Client Component isolado (Recharts precisa do DOM) — `consistencyPercent`
 * já vem calculado do backend; nenhum dia ativo é contado aqui.
 *
 * Cor: verde/`--chart-2` (CLAUDE.md §21 — "verde para progresso"; constância é progresso).
 */
export function ConsistencyChart({ data }: ConsistencyChartProps) {
  const chartData = [{ label: `Últimos ${data.windowDays} dias`, percent: data.consistencyPercent }];
  const summary = `${data.consistencyPercent}% de constância nos últimos ${data.windowDays} dias (${data.activeDays} de ${data.windowDays} dias com estudo).`;

  return (
    <div role="img" aria-label={`Consistência de estudo. ${summary}`} className="space-y-2">
      <div aria-hidden="true" className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value: number) => `${value}%`}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground text-xs"
            />
            <YAxis
              dataKey="label"
              type="category"
              width={110}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground text-xs"
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{
                backgroundColor: "var(--popover)",
                borderColor: "var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--popover-foreground)",
                fontSize: "0.75rem",
              }}
              formatter={(value) => [`${Math.round(Number(value))}%`, "Constância"]}
            />
            <Bar dataKey="percent" fill="var(--chart-2)" radius={[0, 4, 4, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">{summary}</p>
    </div>
  );
}
