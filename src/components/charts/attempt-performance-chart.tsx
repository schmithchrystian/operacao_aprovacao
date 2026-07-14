"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface AttemptPerformanceEntry {
  label: string;
  accuracyPercent: number;
}

interface AttemptPerformanceChartProps {
  data: AttemptPerformanceEntry[];
  /** Usado só no `aria-label`/lista `sr-only` (ex.: "matéria", "assunto"). */
  entityLabel: string;
}

/**
 * Gráfico de barras horizontais "aproveitamento (%) por matéria/assunto" do resultado de um
 * simulado. Mesmo padrão visual/acessível de `@/components/charts/subject-performance-chart.tsx`
 * (dashboard) — generalizado aqui para aceitar tanto `bySubject` quanto `byTopic`
 * (`AttemptResultDTO`) sem duplicar o componente. Client Component isolado (Recharts exige
 * DOM); recebe a série já pronta via props — o percentual de acerto é sempre calculado no
 * backend (`buildAttemptResultDTO`), nunca aqui.
 */
export function AttemptPerformanceChart({ data, entityLabel }: AttemptPerformanceChartProps) {
  const height = Math.max(160, data.length * 44);
  const summary = data.map((item) => `${item.label}: ${Math.round(item.accuracyPercent)}%`).join(", ");

  return (
    <div role="img" aria-label={`Percentual de acerto por ${entityLabel}. ${summary}.`} className="space-y-2">
      <div aria-hidden="true" style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
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
              width={150}
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
              formatter={(value) => [`${Math.round(Number(value))}%`, "Acerto"]}
            />
            <Bar dataKey="accuracyPercent" fill="var(--chart-2)" radius={[0, 4, 4, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {data.map((item) => (
          <li key={item.label}>
            {item.label}: {Math.round(item.accuracyPercent)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
