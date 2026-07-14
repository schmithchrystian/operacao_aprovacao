import type { RankingParticipantEntity } from "@/mocks";
import type { RankingPeriodType, RankingScopeType } from "@/server/repositories/contracts/ranking-score-repository";

/**
 * Períodos e escopos do ranking (Fase 9 — agente `gamification`, CLAUDE.md §17,
 * docs/DATA-MODEL.md §"RankingScore"). `RankingScopeType` cobre `GLOBAL/CONTEST/COURSE/
 * CITY/STATE` (mesmo enum do Prisma) — "turma" (citada no CLAUDE.md §17) NÃO tem entidade
 * própria no schema ainda (sem `Classroom`/coorte); ver pendência no cabeçalho de
 * `ranking-score-repository.ts`.
 */
export type { RankingPeriodType, RankingScopeType };

export interface RankingPeriodWindow {
  /** Chave estável do período — grava em `RankingScore.periodKey`. */
  periodKey: string;
  startDate: Date;
  endDate: Date;
  /** `null` só para `ALL_TIME` (sem janela fixa — ver `ranking/metrics.ts`). */
  totalDays: number | null;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Segunda-feira (UTC) da semana ISO que contém `date`. */
function isoWeekStart(date: Date): Date {
  const day = startOfUtcDay(date);
  const weekday = (day.getUTCDay() + 6) % 7; // 0 = segunda
  day.setUTCDate(day.getUTCDate() - weekday);
  return day;
}

/** Ano+semana ISO-8601 de `date` (algoritmo padrão — quinta-feira da semana define o ano ISO). */
function isoWeekKey(date: Date): string {
  const target = startOfUtcDay(date);
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3); // quinta-feira desta semana

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);

  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${target.getUTCFullYear()}-W${pad2(week)}`;
}

/**
 * Resolve a janela do período (chave + início/fim) a partir de uma data de referência.
 * Determinística: mesma `referenceDate` sempre gera a mesma `periodKey`/janela — requisito de
 * recálculo idempotente (CLAUDE.md §17).
 */
export function buildPeriodWindow(periodType: RankingPeriodType, referenceDate: Date): RankingPeriodWindow {
  switch (periodType) {
    case "DAILY": {
      const start = startOfUtcDay(referenceDate);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
      const periodKey = `${start.getUTCFullYear()}-${pad2(start.getUTCMonth() + 1)}-${pad2(start.getUTCDate())}`;
      return { periodKey, startDate: start, endDate: end, totalDays: 1 };
    }
    case "WEEKLY": {
      const start = isoWeekStart(referenceDate);
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return { periodKey: isoWeekKey(referenceDate), startDate: start, endDate: end, totalDays: 7 };
    }
    case "MONTHLY": {
      const start = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
      const end = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 1) - 1);
      const periodKey = `${start.getUTCFullYear()}-${pad2(start.getUTCMonth() + 1)}`;
      const totalDays = Math.round((end.getTime() - start.getTime() + 1) / (24 * 60 * 60 * 1000));
      return { periodKey, startDate: start, endDate: end, totalDays };
    }
    case "ALL_TIME": {
      const start = new Date(0);
      const end = referenceDate;
      // Sem janela fixa: "constância" em ALL_TIME usa o intervalo pessoal de atividade de cada
      // participante (primeira → última atividade), não um denominador comum — ver metrics.ts.
      return { periodKey: "all", startDate: start, endDate: end, totalDays: null };
    }
  }
}

/** Normaliza `(scopeType, scopeKeyRaw)` para a `scopeKey` NÃO NULA gravada no banco
 *  (docs/DATA-MODEL.md — evita que "global" duplique por causa de `NULL` não ser único). */
export function buildScopeKey(scopeType: RankingScopeType, scopeKeyRaw: string): string {
  switch (scopeType) {
    case "GLOBAL":
      return "global";
    case "CONTEST":
      return `contest:${scopeKeyRaw}`;
    case "COURSE":
      return `course:${scopeKeyRaw}`;
    case "CITY":
      return `city:${scopeKeyRaw.trim().toLowerCase()}`;
    case "STATE":
      return `state:${scopeKeyRaw.trim().toLowerCase()}`;
  }
}

/** Filtra os participantes que pertencem ao escopo `(scopeType, scopeKeyRaw)`. */
export function selectCandidatesForScope(
  participants: readonly RankingParticipantEntity[],
  scopeType: RankingScopeType,
  scopeKeyRaw: string,
): RankingParticipantEntity[] {
  switch (scopeType) {
    case "GLOBAL":
      return [...participants];
    case "CONTEST":
      return participants.filter((participant) => participant.contestId === scopeKeyRaw);
    case "COURSE":
      return participants.filter((participant) => participant.courseId === scopeKeyRaw);
    case "CITY":
      return participants.filter((participant) => participant.city?.toLowerCase() === scopeKeyRaw.toLowerCase());
    case "STATE":
      return participants.filter((participant) => participant.state?.toLowerCase() === scopeKeyRaw.toLowerCase());
  }
}

/** Todas as combinações `(scopeType, scopeKeyRaw)` observadas no conjunto de participantes —
 *  usado pelo cron para recalcular "todos os escopos existentes" sem precisar de uma lista
 *  fixa mantida à parte (Contest/Course/City/State novos entram automaticamente). */
export function discoverScopesFromParticipants(
  participants: readonly RankingParticipantEntity[],
): Array<{ scopeType: RankingScopeType; scopeKeyRaw: string }> {
  const scopes: Array<{ scopeType: RankingScopeType; scopeKeyRaw: string }> = [
    { scopeType: "GLOBAL", scopeKeyRaw: "global" },
  ];

  const addUnique = (scopeType: RankingScopeType, values: ReadonlySet<string>) => {
    for (const value of values) {
      scopes.push({ scopeType, scopeKeyRaw: value });
    }
  };

  addUnique(
    "CONTEST",
    new Set(participants.map((p) => p.contestId).filter((v): v is string => v !== null)),
  );
  addUnique("COURSE", new Set(participants.map((p) => p.courseId).filter((v): v is string => v !== null)));
  addUnique("CITY", new Set(participants.map((p) => p.city).filter((v): v is string => v !== null)));
  addUnique("STATE", new Set(participants.map((p) => p.state).filter((v): v is string => v !== null)));

  return scopes;
}
