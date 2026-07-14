"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMinutesAsDuration } from "@/lib/utils";

export interface EvolutionChartPoint {
  /** Identificador estável do ponto (ex.: `weekStart`/`month` brutos) — usado só como `key`. */
  id: string;
  /** Rótulo já formatado para exibição (ex.: "23/06", "jul/26"). */
  label: string;
  minutes: number;
}

interface EvolutionChartProps {
  data: EvolutionChartPoint[];
  /** Usado só no `aria-label`/resumo textual (ex.: "semana", "mês"). */
  periodLabel: string;
}

/**
 * Gráfico de linha "evolução de horas estudadas" — reaproveitado tanto para a evolução
 * SEMANAL quanto MENSAL (`TrackingOverviewDTO.weeklyEvolution`/`monthlyEvolution`), já que ambas
 * são a mesma forma de série temporal em minutos, só com granularidade/rótulo diferentes
 * (`periodLabel`). Client Component isolado (Recharts precisa do DOM) — recebe a série já
 * pronta via props; nenhum tempo é somado/calculado aqui (CLAUDE.md §14).
 *
 * Cor: amarelo/`--chart-1`, mesmo tom usado por `StudyHoursChart` (dashboard) para o mesmo tipo
 * de métrica ("horas estudadas"), mantendo consistência visual entre as duas telas.
 */
export function EvolutionChart({ data, periodLabel }: EvolutionChartProps) {
  const summary = data.map((point) => `${point.label}: ${formatMinutesAsDuration(point.minutes)}`).join(", ");

  return (
    <div
      role="img"
      aria-label={`Evolução de horas estudadas por ${periodLabel}. ${summary}.`}
      className="space-y-2"
    >
      <div aria-hidden="true" className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} className="fill-muted-foreground text-xs" />
            <YAxis
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground text-xs"
              tickFormatter={(value: number) => `${Math.round(value / 60)}h`}
              width={32}
            />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              contentStyle={{
                backgroundColor: "var(--popover)",
                borderColor: "var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--popover-foreground)",
                fontSize: "0.75rem",
              }}
              formatter={(value) => [formatMinutesAsDuration(Number(value)), "Tempo estudado"]}
            />
            <Line
              type="monotone"
              dataKey="minutes"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--chart-1)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {data.map((point) => (
          <li key={point.id}>
            {point.label}: {formatMinutesAsDuration(point.minutes)}
          </li>
        ))}
      </ul>
    </div>
  );
}
