import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata minutos como "Xh Ymin" (apenas apresentação — o valor em si sempre
 * vem pronto do backend, nunca calculado no cliente a partir do relógio do navegador).
 */
export function formatMinutesAsDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}

/**
 * Formata uma data ISO 8601 para o padrão pt-BR curto (ex.: "10 de jul. de 2026").
 * `timeZone: "UTC"` é OBRIGATÓRIO: as datas de calendário do backend são meia-noite UTC
 * (convenção de `@/server/services/study-plan/date-utils`); sem fixar o fuso, o formatador
 * usaria o fuso LOCAL do navegador e num público UTC-3 exibiria o dia anterior.
 */
export function formatDatePtBr(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso))
}

/**
 * Diferença em dias corridos (calendário UTC) entre "agora" e uma data ISO (meia-noite UTC) —
 * mesma fórmula de `@/server/services/study-plan/date-utils#diffDaysIso` (trunca "agora" para
 * meia-noite UTC antes de subtrair, evitando o off-by-one conforme a hora do dia), reimplementada
 * aqui porque aquele módulo é server-only e este arquivo é importado por Client Components
 * (`@/components/ui/*`). Puramente apresentacional — quem chama decide `now` (Server Components
 * usam o relógio do servidor no momento do render; nunca o relógio do navegador como fonte de
 * verdade, CLAUDE.md §14).
 */
export function diffCalendarDaysUtc(targetIso: string, now: Date = new Date()): number {
  const todayUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const target = Date.parse(targetIso)
  return Math.round((target - todayUtcMidnight) / 86_400_000)
}
