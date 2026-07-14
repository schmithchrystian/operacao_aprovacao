"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DiagnosisRiskLevel } from "@/contracts/tracking";

interface ExamProgressChartProps {
  /** `TrackingExamProgressDTO.planProgressPercent`, já garantido não-nulo por quem chama. */
  planProgressPercent: number;
  /** `TrackingExamProgressDTO.expectedProgressPercent`, já garantido não-nulo por quem chama. */
  expectedProgressPercent: number;
  /** `DiagnosisDTO.delayRisk` — só usado para escolher a cor da barra "Real" (ver comentário abaixo). */
  delayRisk: DiagnosisRiskLevel;
}

const RISK_BAR_COLOR: Record<DiagnosisRiskLevel, string> = {
  LOW: "var(--chart-2)",
  MEDIUM: "var(--chart-1)",
  HIGH: "var(--chart-3)",
};

/**
 * Gráfico de barras horizontais "progresso até a prova": progresso REAL do plano de estudos
 * vs. progresso ESPERADO (linear pelo tempo decorrido) — ambos já calculados pelo backend
 * (`TrackingOverviewDTO.examProgress`). A cor da barra "Real" reflete `delayRisk`
 * (`DiagnosisDTO`, também já calculado pelo backend em `computeDiagnosis`) — o componente só
 * escolhe a cor a partir do enum pronto, nunca recalcula o risco/gap aqui.
 *
 * Client Component isolado (Recharts precisa do DOM). "Esperado" é sempre cinza/`--chart-4`
 * (referência neutra); "Real" varia verde/amarelo/vermelho conforme o risco (CLAUDE.md §21).
 */
export function ExamProgressChart({ planProgressPercent, expectedProgressPercent, delayRisk }: ExamProgressChartProps) {
  const chartData = [
    { key: "expected", label: "Esperado", percent: expectedProgressPercent, fill: "var(--chart-4)" },
    { key: "real", label: "Real", percent: planProgressPercent, fill: RISK_BAR_COLOR[delayRisk] },
  ];
  const summary = `Progresso real: ${Math.round(planProgressPercent)}%. Progresso esperado: ${Math.round(expectedProgressPercent)}%.`;

  return (
    <div role="img" aria-label={`Progresso do plano de estudos até a prova. ${summary}`} className="space-y-2">
      <div aria-hidden="true" className="h-40 w-full">
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
              width={80}
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
              formatter={(value) => [`${Math.round(Number(value))}%`, "Progresso"]}
            />
            <Bar dataKey="percent" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        <li>Esperado: {Math.round(expectedProgressPercent)}%</li>
        <li>Real: {Math.round(planProgressPercent)}%</li>
      </ul>
    </div>
  );
}
