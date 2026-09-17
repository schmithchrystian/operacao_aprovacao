/**
 * Ranking materializado (`RankingScore`, `prisma/schema.prisma`, docs/DATA-MODEL.md) —
 * Fase 9 (agente `gamification`, CLAUDE.md §17, ADR-0009).
 *
 * ÚNICA por `(userId, periodType, periodKey, scopeType, scopeKey, calculationVersion)`.
 * Diferente do ledger de `PointTransaction` (imutável, primeira-escrita-vence), esta tabela é
 * um CACHE recalculável: `upsert` da MESMA versão SOBRESCREVE a linha em vigor (reflete o
 * recálculo mais recente daquela versão da fórmula) — nunca duplica, e rodar o recálculo 2x
 * seguidas com os mesmos dados de entrada produz o mesmo resultado final (idempotente).
 * Versões antigas (`calculationVersion` menor) NUNCA são reescritas — ficam para
 * auditoria/rollback/"evolução" (comparação de posição entre recálculos).
 *
 * A leitura de UI (`ranking/read.ts`) SÓ lê desta tabela — nunca recalcula on-the-fly.
 */
export type RankingPeriodType = "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME";

/**
 * Espelha o enum Prisma `RankingScopeType`. "Turma" (CLAUDE.md §17) ainda NÃO tem entidade
 * própria no schema (`prisma/schema.prisma` não modela turma/coorte) — pendência explícita
 * para o agente `database` antes de um escopo `CLASS` poder ser adicionado aqui.
 */
export type RankingScopeType = "GLOBAL" | "CONTEST" | "COURSE" | "CITY" | "STATE";

/** Detalhe de uma métrica normalizada dentro da composição do score (auditoria/transparência). */
export interface RankingMetricBreakdownEntry {
  /** Valor bruto da métrica (antes de normalizar) — ex.: 0-100 para aproveitamento. */
  raw: number;
  /** Valor normalizado (min-max) no conjunto do escopo, 0-1. */
  normalized: number;
  /** Peso vigente da métrica na fórmula (`config/business.ts#RANKING_WEIGHTS`). */
  weight: number;
  /** `normalized * weight` — parcela desta métrica no `score` final. */
  contribution: number;
}

/**
 * Conteúdo de `RankingScore.breakdown` (Json no Prisma). Guarda tanto a composição normalizada
 * (auditoria da fórmula, CLAUDE.md §17) quanto os valores de EXIBIÇÃO (pontos/XP/sequência) já
 * resolvidos no momento do cálculo — a leitura (`ranking/read.ts`) NUNCA recalcula nem chama
 * outros repositórios: tudo que a UI precisa já está aqui (cache completo).
 */
export interface RankingBreakdown {
  metrics: {
    mockExamPerformance: RankingMetricBreakdownEntry;
    lessonsCompleted: RankingMetricBreakdownEntry;
    consistency: RankingMetricBreakdownEntry;
    validHours: RankingMetricBreakdownEntry;
    goalsCompleted: RankingMetricBreakdownEntry;
  };
  display: {
    points: number;
    xp: number;
    streakDays: number;
  };
}

export interface RankingScoreEntity {
  id: string;
  userId: string;
  periodType: RankingPeriodType;
  periodKey: string;
  scopeType: RankingScopeType;
  scopeKey: string;
  calculationVersion: number;
  score: number;
  rank: number | null;
  breakdown: RankingBreakdown | null;
  /** ISO 8601 — quando esta linha foi (re)calculada. */
  calculatedAt: string;
}

export interface RankingScoreUpsertInput {
  userId: string;
  periodType: RankingPeriodType;
  periodKey: string;
  scopeType: RankingScopeType;
  scopeKey: string;
  calculationVersion: number;
  score: number;
  rank: number | null;
  breakdown?: RankingBreakdown | null;
  /** Relógio injetado pelo chamador (recálculo) — nunca `Date.now()` direto em código puro. */
  now: Date;
}

export interface FinalizeRankingScopeVersionInput {
  periodType: RankingPeriodType;
  periodKey: string;
  scopeType: RankingScopeType;
  scopeKey: string;
  calculationVersion: number;
  userIds: string[];
  now: Date;
}

/** Abstração de persistência do ranking materializado (ADR-0002). */
export interface RankingScoreRepository {
  /** Prune removed candidates and persist snapshot metadata, including an empty result. */
  finalizeScopeVersion(input: FinalizeRankingScopeVersionInput): Promise<void>;
  listKnownScopes(): Promise<Array<{ scopeType: RankingScopeType; scopeKey: string }>>;
  /**
   * Cria ou sobrescreve a linha da MESMA versão para `(userId, periodType, periodKey,
   * scopeType, scopeKey, calculationVersion)` — recálculo idempotente (nunca duplica; a
   * segunda chamada com os mesmos dados produz o mesmo estado final).
   */
  upsert(input: RankingScoreUpsertInput): Promise<RankingScoreEntity>;
  /** Todas as linhas de uma versão específica do escopo (qualquer ordem — o chamador ordena por `rank`). */
  listByScopeAndVersion(
    periodType: RankingPeriodType,
    periodKey: string,
    scopeType: RankingScopeType,
    scopeKey: string,
    calculationVersion: number,
  ): Promise<RankingScoreEntity[]>;
  /** Última (maior) versão já calculada para o escopo, ou `null` se nunca calculado. */
  findLatestVersion(
    periodType: RankingPeriodType,
    periodKey: string,
    scopeType: RankingScopeType,
    scopeKey: string,
  ): Promise<number | null>;
  /** Todas as versões já calculadas do escopo, em ordem decrescente (mais recente primeiro). */
  listVersionsDesc(
    periodType: RankingPeriodType,
    periodKey: string,
    scopeType: RankingScopeType,
    scopeKey: string,
  ): Promise<number[]>;
  /** Linha de um usuário específico numa versão do escopo (posição do próprio usuário / evolução). */
  findByUserScopeAndVersion(
    userId: string,
    periodType: RankingPeriodType,
    periodKey: string,
    scopeType: RankingScopeType,
    scopeKey: string,
    calculationVersion: number,
  ): Promise<RankingScoreEntity | null>;
}
