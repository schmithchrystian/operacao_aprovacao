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
