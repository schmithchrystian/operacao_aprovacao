"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { TrackingTimeDistributionEntryDTO } from "@/contracts/tracking";
import { formatMinutesAsDuration } from "@/lib/utils";

interface TimeDistributionChartProps {
  data: TrackingTimeDistributionEntryDTO[];
}

/** Paleta cíclica dos 5 tons `--chart-*` já usados pelos demais gráficos — aqui sem
 *  significado de "bom/ruim" (é uma distribuição proporcional, não desempenho). */
const SLICE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function sliceColor(index: number): string {
  return SLICE_COLORS[index % SLICE_COLORS.length] ?? "var(--chart-5)";
}

/**
 * Gráfico de pizza "distribuição do tempo válido de estudo por matéria"
 * (`TrackingOverviewDTO.timeDistribution`). Client Component isolado (Recharts precisa do DOM)
 * — recebe a série já pronta via props; nenhum tempo é somado/calculado aqui (CLAUDE.md §14),
 * só distribuído visualmente entre as matérias.
 */
export function TimeDistributionChart({ data }: TimeDistributionChartProps) {
  const totalMinutes = data.reduce((sum, entry) => sum + entry.minutes, 0);
  const summary = data
    .map((entry) => {
      const percent = totalMinutes > 0 ? Math.round((entry.minutes / totalMinutes) * 100) : 0;
      return `${entry.subjectName}: ${formatMinutesAsDuration(entry.minutes)} (${percent}%)`;
    })
    .join(", ");

  return (
    <div role="img" aria-label={`Distribuição do tempo de estudo por matéria. ${summary}.`} className="space-y-3">
      <div aria-hidden="true" className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="minutes"
              nameKey="subjectName"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={entry.subjectId} fill={sliceColor(index)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover)",
                borderColor: "var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--popover-foreground)",
                fontSize: "0.75rem",
              }}
              formatter={(value, name) => [formatMinutesAsDuration(Number(value)), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legenda visível (não só `sr-only`): num gráfico de pizza a cor por si só não é
          suficiente para diferenciar categorias — todo mundo se beneficia do rótulo ao lado
          da cor, não só leitores de tela. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {data.map((entry, index) => (
          <li key={entry.subjectId} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: sliceColor(index) }}
            />
            <span className="text-muted-foreground">
              {entry.subjectName}: {formatMinutesAsDuration(entry.minutes)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
