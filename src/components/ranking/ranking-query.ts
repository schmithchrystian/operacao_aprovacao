import type { RankingPeriodTypeInput, RankingScopeTypeInput } from "@/contracts/ranking";

/**
 * Mapeamento entre a querystring (amigável, em português) da página `/ranking` e os enums do
 * contrato de backend (`@/contracts/ranking`). Módulo puro (sem `"use client"`/`"use server"`)
 * — importado tanto pela página (Server Component) quanto pelos filtros (Client Component),
 * para as duas pontas nunca divergirem sobre nomes de parâmetro/valores aceitos.
 *
 * Só existem os escopos que o backend realmente suporta (GLOBAL/CONTEST/COURSE/CITY/STATE —
 * ver `@/server/services/gamification/ranking/scope.ts`). Nada de "turma" aqui.
 */

export type PeriodParam = "geral" | "semanal" | "mensal";
export type ScopeParam = "global" | "concurso" | "curso" | "cidade" | "estado";

export interface RankingScopeOption {
  value: string;
  label: string;
}

export const PERIOD_OPTIONS: ReadonlyArray<{ value: PeriodParam; label: string }> = [
  { value: "geral", label: "Geral" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
];

export const SCOPE_OPTIONS: ReadonlyArray<{ value: ScopeParam; label: string }> = [
  { value: "global", label: "Global" },
  { value: "concurso", label: "Concurso" },
  { value: "curso", label: "Curso" },
  { value: "cidade", label: "Cidade" },
  { value: "estado", label: "Estado" },
];

const PERIOD_TO_TYPE: Record<PeriodParam, RankingPeriodTypeInput> = {
  geral: "ALL_TIME",
  semanal: "WEEKLY",
  mensal: "MONTHLY",
};

const SCOPE_TO_TYPE: Record<ScopeParam, RankingScopeTypeInput> = {
  global: "GLOBAL",
  concurso: "CONTEST",
  curso: "COURSE",
  cidade: "CITY",
  estado: "STATE",
};

export function periodParamToType(period: PeriodParam): RankingPeriodTypeInput {
  return PERIOD_TO_TYPE[period];
}

export function scopeParamToType(scope: ScopeParam): RankingScopeTypeInput {
  return SCOPE_TO_TYPE[scope];
}

function isPeriodParam(value: string | undefined): value is PeriodParam {
  return value !== undefined && PERIOD_OPTIONS.some((option) => option.value === value);
}

function isScopeParam(value: string | undefined): value is ScopeParam {
  return value !== undefined && SCOPE_OPTIONS.some((option) => option.value === value);
}

/** `searchParams` do App Router pode entregar `string | string[] | undefined` por chave. */
export type RankingSearchParams = Record<string, string | string[] | undefined>;

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export interface ParsedRankingQuery {
  period: PeriodParam;
  scope: ScopeParam;
  /** Cru — id do concurso/curso, ou nome de cidade/estado. Ignorado quando `scope === "global"`. */
  scopeKey: string;
  /** 1-based. */
  page: number;
}

/** Lê e normaliza a querystring de `/ranking`. Nunca lança — entradas inválidas caem no default. */
export function parseRankingQuery(searchParams: RankingSearchParams): ParsedRankingQuery {
  const periodRaw = firstParam(searchParams.periodo);
  const scopeRaw = firstParam(searchParams.escopo);
  const scopeKeyRaw = firstParam(searchParams.chave);
  const pageRaw = firstParam(searchParams.pagina);

  const period = isPeriodParam(periodRaw) ? periodRaw : "geral";
  const scope = isScopeParam(scopeRaw) ? scopeRaw : "global";
  const scopeKey = scopeKeyRaw?.trim() ?? "";
  const pageNumber = Number(pageRaw);
  const page = Number.isFinite(pageNumber) && pageNumber >= 1 ? Math.floor(pageNumber) : 1;

  return { period, scope, scopeKey, page };
}

/** Monta a URL de `/ranking` preservando os filtros atuais, com os overrides aplicados. */
export function buildRankingHref(
  pathname: string,
  current: ParsedRankingQuery,
  overrides: Partial<ParsedRankingQuery>,
): string {
  const next: ParsedRankingQuery = { ...current, ...overrides };
  const params = new URLSearchParams();

  if (next.period !== "geral") params.set("periodo", next.period);
  if (next.scope !== "global") params.set("escopo", next.scope);
  if (next.scope !== "global" && next.scopeKey) params.set("chave", next.scopeKey);
  if (next.page > 1) params.set("pagina", String(next.page));

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
