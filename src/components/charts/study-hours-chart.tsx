"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardStudyHoursPoint } from "@/contracts/dashboard";
import { formatMinutesAsDuration } from "@/lib/utils";

interface StudyHoursChartProps {
  data: DashboardStudyHoursPoint[];
}

const WEEKDAY_LABELS: Record<DashboardStudyHoursPoint["weekday"], string> = {
  seg: "Seg",
  ter: "Ter",
  qua: "Qua",
  qui: "Qui",
  sex: "Sex",
  sab: "Sáb",
  dom: "Dom",
};

/**
 * Gráfico de barras "horas estudadas por dia da semana". Client Component isolado
 * (Recharts precisa do DOM) — recebe a série já pronta via props, sem buscar dados
 * no cliente (CLAUDE.md: nenhum tempo/cálculo de negócio no frontend).
 *
 * Cor: amarelo/`--primary` (destaque), conforme a identidade visual do `frontend`.
 */
export function StudyHoursChart({ data }: StudyHoursChartProps) {
  const chartData = data.map((point) => ({
    weekday: WEEKDAY_LABELS[point.weekday],
    minutes: point.minutes,
  }));

  const summary = data
    .map((point) => `${WEEKDAY_LABELS[point.weekday]}: ${formatMinutesAsDuration(point.minutes)}`)
    .join(", ");

  return (
    <div role="img" aria-label={`Horas estudadas por dia da semana. ${summary}.`} className="space-y-2">
      <div aria-hidden="true" className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="weekday"
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground text-xs"
              tickFormatter={(value: number) => `${Math.round(value / 60)}h`}
              width={32}
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
              formatter={(value) => [formatMinutesAsDuration(Number(value)), "Tempo estudado"]}
            />
            <Bar dataKey="minutes" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {data.map((point) => (
          <li key={point.weekday}>
            {WEEKDAY_LABELS[point.weekday]}: {formatMinutesAsDuration(point.minutes)}
          </li>
        ))}
      </ul>
    </div>
  );
}
