/**
 * Utilitários de data client-side para o calendário de "Plano de estudos" (Fase 11 — UI do
 * agente `frontend`). Mesma convenção do backend (`@/server/services/study-plan/date-utils.ts`,
 * que não é importável do cliente): tudo em UTC, nunca no fuso horário local de quem executa.
 * `timeZone: "UTC"` explícito nos formatadores evita tanto exibir o dia civil errado (a
 * diferença de fuso pode "virar" a data) quanto um mismatch de hidratação entre servidor e
 * navegador quando estão em fusos diferentes.
 *
 * Puramente aritmética/formatação de calendário — nenhuma regra de negócio, nenhuma leitura de
 * `Date.now()`: a semana/mês inicialmente exibidos vêm de `plan.startDate` (prop já resolvida
 * pelo servidor), nunca do relógio do cliente.
 */

const WEEKDAY_SHORT_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  timeZone: "UTC",
});
const DAY_MONTH_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const FULL_DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function capitalize(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** "Seg", "Ter", ... a partir de uma data ISO. */
export function formatWeekdayShort(iso: string): string {
  return capitalize(WEEKDAY_SHORT_FORMAT.format(new Date(iso)));
}

/** "10 de jul." a partir de uma data ISO. */
export function formatDayMonth(iso: string): string {
  return DAY_MONTH_FORMAT.format(new Date(iso));
}

/** "Julho de 2026" a partir de uma chave `yyyy-mm`. */
export function formatMonthLabel(monthKey: string): string {
  return capitalize(MONTH_YEAR_FORMAT.format(new Date(`${monthKey}-01T00:00:00.000Z`)));
}

/** "14 de julho de 2026" a partir de uma data ISO. */
export function formatFullDate(iso: string): string {
  return FULL_DATE_FORMAT.format(new Date(iso));
}

/** Normaliza para a meia-noite UTC do mesmo dia civil. */
export function toIsoDateUTC(input: string): string {
  const date = new Date(input);
  const truncated = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return new Date(truncated).toISOString();
}

/** Soma (ou subtrai, com `days` negativo) dias corridos a uma data ISO (meia-noite UTC). */
export function addDaysIsoUTC(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  const shifted = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days);
  return new Date(shifted).toISOString();
}

/** Início (segunda-feira, UTC, meia-noite) da semana civil que contém `isoDate`. */
export function weekStartIsoUTC(isoDate: string): string {
  const date = new Date(isoDate);
  const weekday = date.getUTCDay(); // 0 = domingo ... 6 = sábado
  const daysSinceMonday = (weekday + 6) % 7; // segunda=0, terça=1, ..., domingo=6
  return addDaysIsoUTC(toIsoDateUTC(isoDate), -daysSinceMonday);
}

/** `yyyy-mm` (mês civil UTC) de uma data ISO. */
export function monthKeyIsoUTC(isoDate: string): string {
  const date = new Date(isoDate);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

/** Chave `yyyy-mm` deslocada por `delta` meses (negativo = mês anterior). */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const shifted = new Date(Date.UTC(year, month + delta, 1));
  return monthKeyIsoUTC(shifted.toISOString());
}

/**
 * Grid do calendário mensal (semanas começando na segunda) para `monthKey` — sempre um múltiplo
 * de 7 células, com `null` nas posições fora do mês (preenchimento antes do dia 1 e depois do
 * último dia) para alinhar visualmente com o cabeçalho de dias da semana.
 */
export function buildMonthGridDates(monthKey: string): (string | null)[] {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;

  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7; // segunda=0

  const cells: (string | null)[] = [];
  for (let index = 0; index < leadingBlanks; index += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(Date.UTC(year, month, day)).toISOString());
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}
