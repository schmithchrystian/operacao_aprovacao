/**
 * Utilitários de data PUROS (Fase 11 — agente `study-tracking`) para o domínio de plano de
 * estudos. Operam sempre em UTC (nunca no fuso horário local da máquina que executa o
 * processo) — determinístico independente de onde o código roda (CI, dev, produção). Datas de
 * calendário são strings ISO 8601 à MEIA-NOITE UTC (`yyyy-mm-ddT00:00:00.000Z`), nunca um
 * `Date` "cru" com hora/minuto — ver `@/contracts/study-plan`.
 *
 * Nenhuma função aqui lê `Date.now()` — "hoje" é sempre um parâmetro explícito vindo de quem
 * chama (mesma regra de "injete now/seed" aplicada ao resto do projeto).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Normaliza um `Date` (ou ISO) para a meia-noite UTC do mesmo dia civil (UTC). */
export function toIsoDateUTC(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const truncated = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return new Date(truncated).toISOString();
}

/** Soma (ou subtrai, com `days` negativo) dias corridos a uma data ISO (meia-noite UTC). */
export function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  const shifted = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days);
  return new Date(shifted).toISOString();
}

/** Nº de dias corridos entre duas datas ISO — `endIso - startIso`, em dias (pode ser negativo). */
export function diffDaysIso(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  return Math.round((end - start) / MS_PER_DAY);
}

/** `yyyy-mm` (mês civil UTC) de uma data ISO — chave de agrupamento do calendário mensal. */
export function monthKeyIso(isoDate: string): string {
  const date = new Date(isoDate);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

/** Início (segunda-feira, UTC, meia-noite) da semana civil que contém `isoDate` — usado só para
 *  AGRUPAR dias no calendário semanal de exibição (`StudyPlanWeekDTO`); independente do ciclo
 *  de 7 dias usado pela heurística de geração (`plan-generator.ts`, ancorado em `startDate`). */
export function weekStartIso(isoDate: string): string {
  const date = new Date(isoDate);
  const weekday = date.getUTCDay(); // 0 = domingo ... 6 = sábado
  const daysSinceMonday = (weekday + 6) % 7; // segunda=0, terça=1, ..., domingo=6
  return addDaysIso(toIsoDateUTC(date), -daysSinceMonday);
}
