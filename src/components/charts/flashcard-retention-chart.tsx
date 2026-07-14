"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { RetentionStatsDTO } from "@/contracts/flashcards";

interface FlashcardRetentionChartProps {
  data: RetentionStatsDTO;
}

/**
 * Gráfico de pizza "revisões corretas vs. erradas" (Difícil/Médio/Fácil contam como acerto,
 * Errei não — mesma regra de `isCorrectRating`,
 * `@/server/services/flashcards/spaced-repetition.ts`) sobre TODO o histórico de revisões do
 * aluno (`RetentionStatsDTO`). Client Component isolado (Recharts precisa do DOM) — mesmo padrão
 * de `@/components/charts/accuracy-breakdown-chart.tsx`: a única conta feita aqui é a subtração
 * `totalReviews - correctReviews` (revisões erradas), apresentação pura — `retentionPercent` em
 * si já vem calculado pronto do backend (`getRetentionStats`).
 */
export function FlashcardRetentionChart({ data }: FlashcardRetentionChartProps) {
  const incorrectReviews = Math.max(0, data.totalReviews - data.correctReviews);
  const chartData = [
    { key: "correct", label: "Acertos", value: data.correctReviews, fill: "var(--chart-2)" },
    { key: "wrong", label: "Erros", value: incorrectReviews, fill: "var(--chart-3)" },
  ];
  const summary = `Acertos: ${data.correctReviews}, Erros: ${incorrectReviews}, de ${data.totalReviews} revisões (${Math.round(data.retentionPercent)}% de retenção).`;

  return (
    <div role="img" aria-label={`Retenção nas revisões de flashcards. ${summary}`} className="space-y-2">
      <div aria-hidden="true" className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={45} outerRadius={80} paddingAngle={2}>
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
        <li>Acertos: {data.correctReviews}</li>
        <li>Erros: {incorrectReviews}</li>
        <li>Total de revisões: {data.totalReviews}</li>
      </ul>
    </div>
  );
}
