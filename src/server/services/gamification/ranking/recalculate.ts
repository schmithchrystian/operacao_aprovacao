import { RANKING_CALCULATION_VERSION, RANKING_DEFAULT_RECALC_PERIOD_TYPES } from "@/config/business";
import { mockRankingParticipants } from "@/mocks";
import { auditLog } from "@/server/audit";
import { getRepositories } from "@/server/repositories";
import type { RankingBreakdown } from "@/server/repositories/contracts/ranking-score-repository";
import { computeRankingScores } from "./formula";
import { gatherRawMetrics } from "./metrics";
import {
  buildPeriodWindow,
  buildScopeKey,
  discoverScopesFromParticipants,
  selectCandidatesForScope,
  type RankingPeriodType,
  type RankingScopeType,
} from "./scope";
import { compareRankingEntries } from "./tiebreak";

/**
 * Recálculo/materialização do ranking (Fase 9 — agente `gamification`, ADR-0009, CLAUDE.md
 * §17). Só esta função (e o cron que a invoca) grava em `RankingScore` — a leitura
 * (`ranking/read.ts`) é sempre da tabela já materializada, nunca recalcula on-the-fly.
 *
 * IDEMPOTENTE: chamar de novo para o mesmo `(periodType, referenceDate, scopeType,
 * scopeKeyRaw, calculationVersion)` sobre os MESMOS dados de entrada produz o mesmo conjunto
 * final de linhas (mesmo score/rank por usuário) — `RankingScoreRepository.upsert` sobrescreve
 * a linha em vigor da versão em vez de duplicar (ver contrato do repositório).
 */
export interface RecalculateRankingScopeInput {
  periodType: RankingPeriodType;
  scopeType: RankingScopeType;
  /** Identificador cru do escopo (ex.: id do concurso/curso, nome da cidade/UF; `"global"` para GLOBAL). */
  scopeKeyRaw: string;
  /** Data de referência para resolver a janela do período — default `new Date()`. */
  referenceDate?: Date;
  /** Versão da fórmula a gravar — default `RANKING_CALCULATION_VERSION` (`config/business.ts`). */
  calculationVersion?: number;
}

export interface RecalculateRankingScopeResult {
  periodType: RankingPeriodType;
  periodKey: string;
  scopeType: RankingScopeType;
  scopeKey: string;
  calculationVersion: number;
  participantCount: number;
}

/** Recalcula e materializa UM escopo/período. */
export async function recalculateRankingForScope(
  input: RecalculateRankingScopeInput,
): Promise<RecalculateRankingScopeResult> {
  const referenceDate = input.referenceDate ?? new Date();
  const calculationVersion = input.calculationVersion ?? RANKING_CALCULATION_VERSION;
  const window = buildPeriodWindow(input.periodType, referenceDate);
  const scopeKey = buildScopeKey(input.scopeType, input.scopeKeyRaw);
  const correlationId = `${input.periodType}:${window.periodKey}:${scopeKey}:v${calculationVersion}`;

  const candidates = selectCandidatesForScope(mockRankingParticipants, input.scopeType, input.scopeKeyRaw);

  if (candidates.length === 0) {
    auditLog({
      operation: "gamification.ranking.recalculate.empty-scope",
      entity: "RankingScore",
      result: "success",
      correlationId,
    });
    return {
      periodType: input.periodType,
      periodKey: window.periodKey,
      scopeType: input.scopeType,
      scopeKey,
      calculationVersion,
      participantCount: 0,
    };
  }

  const gathered = await Promise.all(
    candidates.map(async (participant) => ({ participant, metrics: await gatherRawMetrics(participant, window) })),
  );

  const scored = computeRankingScores(gathered.map((entry) => ({ participant: entry.participant, metrics: entry.metrics })));

  const withTieBreakInput = scored.map((entry, index) => ({
    ...entry,
    timeToScoreMs: gathered[index]!.metrics.timeToScoreMs,
    display: {
      points: gathered[index]!.metrics.points,
      xp: gathered[index]!.metrics.xp,
      streakDays: gathered[index]!.metrics.streakDays,
    },
  }));

  const sorted = [...withTieBreakInput].sort((a, b) =>
    compareRankingEntries(
      {
        userId: a.participant.userId,
        score: a.score,
        mockExamPerformance: a.breakdown.mockExamPerformance.raw,
        lessonsCompleted: a.breakdown.lessonsCompleted.raw,
        timeToScoreMs: a.timeToScoreMs,
      },
      {
        userId: b.participant.userId,
        score: b.score,
        mockExamPerformance: b.breakdown.mockExamPerformance.raw,
        lessonsCompleted: b.breakdown.lessonsCompleted.raw,
        timeToScoreMs: b.timeToScoreMs,
      },
    ),
  );

  const repos = getRepositories();
  for (let index = 0; index < sorted.length; index += 1) {
    const entry = sorted[index]!;
    const breakdown: RankingBreakdown = { metrics: entry.breakdown, display: entry.display };
    await repos.rankingScores.upsert({
      userId: entry.participant.userId,
      periodType: input.periodType,
      periodKey: window.periodKey,
      scopeType: input.scopeType,
      scopeKey,
      calculationVersion,
      score: entry.score,
      rank: index + 1,
      breakdown,
      now: referenceDate,
    });
  }

  auditLog({
    operation: "gamification.ranking.recalculate",
    entity: "RankingScore",
    result: "success",
    correlationId,
    metadata: { participantCount: sorted.length },
  });

  return {
    periodType: input.periodType,
    periodKey: window.periodKey,
    scopeType: input.scopeType,
    scopeKey,
    calculationVersion,
    participantCount: sorted.length,
  };
}

/**
 * Recalcula TODOS os escopos observados no dataset de participantes (`GLOBAL` + cada
 * concurso/curso/cidade/estado distintos) para os períodos default (`config/business.ts` —
 * `WEEKLY`/`MONTHLY`/`ALL_TIME`; `DAILY` fica de fora do default). Usado pelo cron
 * (`/api/cron/ranking-recalc`) quando disparado sem escopo/período explícitos no corpo.
 */
export async function recalculateAllRankingScopes(
  referenceDate: Date = new Date(),
): Promise<RecalculateRankingScopeResult[]> {
  const scopes = discoverScopesFromParticipants(mockRankingParticipants);
  const results: RecalculateRankingScopeResult[] = [];

  for (const periodType of RANKING_DEFAULT_RECALC_PERIOD_TYPES) {
    for (const scope of scopes) {
      // Recálculo sequencial deliberado (mock em memória de processo; upserts precisam
      // observar o estado gravado pelo anterior — sem ganho real em paralelizar aqui).
      results.push(
        await recalculateRankingForScope({
          periodType,
          scopeType: scope.scopeType,
          scopeKeyRaw: scope.scopeKeyRaw,
          referenceDate,
        }),
      );
    }
  }

  return results;
}
