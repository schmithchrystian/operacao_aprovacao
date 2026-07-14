"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { TrackingQuestionsSummaryDTO } from "@/contracts/tracking";

interface AccuracyBreakdownChartProps {
  data: TrackingQuestionsSummaryDTO;
}

/**
 * Gráfico de pizza "acertos vs. erros" sobre TODO o histórico de questões respondidas
 * (`TrackingOverviewDTO.questions`). Client Component isolado (Recharts precisa do DOM) —
 * `totalAnswered`/`totalCorrect`/`accuracyPercent` já vêm prontos do backend; a única conta
 * feita aqui é `totalAnswered - totalCorrect` (erros), uma subtração de apresentação — nenhum
 * aproveitamento é recalculado (CLAUDE.md — "não calcule regra crítica no frontend").
 *
 * Cores: verde (`--chart-2`, acerto) e vermelho (`--chart-3`, erro) — CLAUDE.md §21.
 */
export function AccuracyBreakdownChart({ data }: AccuracyBreakdownChartProps) {
  const wrongCount = Math.max(0, data.totalAnswered - data.totalCorrect);
  const chartData = [
    { key: "correct", label: "Acertos", value: data.totalCorrect, fill: "var(--chart-2)" },
    { key: "wrong", label: "Erros", value: wrongCount, fill: "var(--chart-3)" },
  ];
  const summary = `Acertos: ${data.totalCorrect}, Erros: ${wrongCount}, de ${data.totalAnswered} questões respondidas (${Math.round(data.accuracyPercent)}% de aproveitamento).`;

  return (
    <div role="img" aria-label={`Acertos e erros nas questões respondidas. ${summary}`} className="space-y-2">
      <div aria-hidden="true" className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
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
              formatter={(value, name) => [value, String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        <li>Acertos: {data.totalCorrect}</li>
        <li>Erros: {wrongCount}</li>
        <li>Total de questões respondidas: {data.totalAnswered}</li>
      </ul>
    </div>
  );
}
