"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardSubjectPerformance } from "@/contracts/dashboard";

interface SubjectPerformanceChartProps {
  data: DashboardSubjectPerformance[];
}

/**
 * Gráfico de barras horizontais "desempenho (% de acerto) por matéria". Client Component
 * isolado — recebe a série já pronta via props; o percentual de acerto definitivo é
 * calculado no backend (`study-tracking`/`simulations`), nunca aqui.
 *
 * Cor: verde/`--success` (progresso e acertos), conforme a identidade visual do `frontend`.
 * Barras horizontais evitam cortar os nomes das matérias em telas estreitas.
 */
export function SubjectPerformanceChart({ data }: SubjectPerformanceChartProps) {
  const height = Math.max(160, data.length * 44);

  const summary = data.map((item) => `${item.subject}: ${Math.round(item.accuracyPercent)}%`).join(", ");

  return (
    <div
      role="img"
      aria-label={`Percentual de acerto por matéria. ${summary}.`}
      className="space-y-2"
    >
      <div aria-hidden="true" style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
          >
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
              dataKey="subject"
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
          <li key={item.subject}>
            {item.subject}: {Math.round(item.accuracyPercent)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
