"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface AdminRankingBarChartProps {
  data: { label: string; value: number }[];
  valueLabel: string;
  /** Token de cor Tailwind/CSS var (ex.: `var(--chart-1)`). */
  color?: string;
}

/**
 * Gráfico de barras horizontais genérico para os rankings do dashboard admin (cursos/aulas/
 * simulados mais acessados, Fase 17). Mesmo padrão de
 * `@/components/charts/subject-performance-chart.tsx` (Client Component isolado, Recharts,
 * barras horizontais para não cortar títulos longos) — generalizado aqui porque os 3 rankings do
 * dashboard administrativo têm o mesmo formato (rótulo + contagem), evitando 3 componentes quase
 * idênticos.
 */
export function AdminRankingBarChart({ data, valueLabel, color = "var(--chart-1)" }: AdminRankingBarChartProps) {
  if (data.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">Sem dados suficientes ainda.</p>;
  }

  const height = Math.max(140, data.length * 40);
  const summary = data.map((item) => `${item.label}: ${item.value}`).join(", ");

  return (
    <div role="img" aria-label={`${valueLabel} por item. ${summary}.`} className="space-y-2">
      <div aria-hidden="true" style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} className="fill-muted-foreground text-xs" />
            <YAxis
              dataKey="label"
              type="category"
              width={160}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground text-xs"
              tickFormatter={(value: string) => (value.length > 22 ? `${value.slice(0, 22)}…` : value)}
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
              formatter={(value) => [value, valueLabel]}
            />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {data.map((item) => (
          <li key={item.label}>
            {item.label}: {item.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
