import { ShieldAlert, ShieldCheck, ShieldX, type LucideIcon } from "lucide-react";
import type { DiagnosisRiskLevel } from "@/contracts/tracking";

/**
 * Rótulos, cores e formatadores (pt-BR) da UI de acompanhamento/diagnóstico (Fase 12 — UI do
 * agente `frontend` sobre `@/contracts/tracking`). Puramente apresentacional — nenhuma regra de
 * negócio aqui: `DiagnosisRiskLevel` já vem calculado por `computeDiagnosis`
 * (`@/server/services/study-tracking/diagnosis`); estes mapas só traduzem o enum para
 * texto+cor+ícone (nunca só cor — badge de risco sempre exibe o texto junto). Mesmo padrão de
 * `@/components/simulations/labels.ts` (`DIFFICULTY_LABEL`/`DIFFICULTY_BADGE_CLASS`).
 */

export const DIAGNOSIS_RISK_LABEL: Record<DiagnosisRiskLevel, string> = {
  LOW: "Risco baixo",
  MEDIUM: "Risco médio",
  HIGH: "Risco alto",
};

export const DIAGNOSIS_RISK_BADGE_CLASS: Record<DiagnosisRiskLevel, string> = {
  LOW: "border-success/40 bg-success/10 text-success",
  MEDIUM: "border-primary/40 bg-primary/10 text-primary",
  HIGH: "border-destructive/40 bg-destructive/10 text-destructive",
};

export const DIAGNOSIS_RISK_ICON: Record<DiagnosisRiskLevel, LucideIcon> = {
  LOW: ShieldCheck,
  MEDIUM: ShieldAlert,
  HIGH: ShieldX,
};

/**
 * Rótulo curto "dd/mm" para o início de uma semana (`TrackingWeeklyPointDTO.weekStart`, ISO 8601).
 * `timeZone: "UTC"` é OBRIGATÓRIO: as datas do backend são meia-noite UTC (convenção de
 * `@/server/services/study-plan/date-utils`); formatar sem fixar o fuso usaria o fuso LOCAL do
 * navegador e, num público UTC-3, exibiria o dia anterior (segunda 13/07 viraria "12/07").
 */
export function formatWeekLabel(weekStartIso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(
    new Date(weekStartIso),
  );
}

/**
 * Rótulo curto "mmm/aa" para um mês (`TrackingMonthlyPointDTO.month`, formato `yyyy-mm`).
 * `timeZone: "UTC"` pelo mesmo motivo de `formatWeekLabel`: sem ele, o dia 1 à meia-noite UTC
 * recuaria para o último dia do mês anterior no fuso local negativo ("2026-07" viraria "jun/26").
 */
export function formatMonthLabel(monthKey: string): string {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
}

/**
 * Formata segundos (fracionários) como "Xmin Ys" (ou só "Ys" abaixo de 1min) — usado para
 * "tempo médio por questão" (`TrackingQuestionsSummaryDTO.averageSecondsPerQuestion`), sempre
 * um valor pequeno (segundos por questão), diferente do `formatSecondsAsDuration` de
 * `@/components/simulations/labels` (que trata durações de prova inteira, com horas).
 */
export function formatAverageSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return minutes > 0 ? `${minutes}min ${seconds}s` : `${seconds}s`;
}
