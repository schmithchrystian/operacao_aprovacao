import { ConflictError } from "@/server/errors";
import { inRepositoryTransaction } from "@/server/repositories/transaction";
import { getEffectiveBusinessConfig } from "@/server/services/admin/effective-config";
import { RANKING_CALCULATION_VERSION, RANKING_DEFAULT_RECALC_PERIOD_TYPES } from "@/config/business";
import { loadRankingParticipants } from "./participants";
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

export async function recalculateRankingForScope(input: RecalculateRankingScopeInput): Promise<RecalculateRankingScopeResult> {
  return inRepositoryTransaction(() => recalculateRankingForScopeInternal(input));
}

/** Recalcula e materializa UM escopo/período. */
async function recalculateRankingForScopeInternal(
  input: RecalculateRankingScopeInput,
): Promise<RecalculateRankingScopeResult> {
  const referenceDate = input.referenceDate ?? new Date();
  const config = await getEffectiveBusinessConfig();
  const requestedVersion = input.calculationVersion ?? (RANKING_CALCULATION_VERSION + config.version - 1);
  const window = buildPeriodWindow(input.periodType, referenceDate);
  const scopeKey = buildScopeKey(input.scopeType, input.scopeKeyRaw);
  const latestVersion = await getRepositories().rankingScores.findLatestVersion(input.periodType, window.periodKey, input.scopeType, scopeKey);
  if (input.calculationVersion !== undefined && latestVersion !== null && requestedVersion < latestVersion) throw new ConflictError("Não é permitido reescrever uma versão histórica do ranking.");
  const calculationVersion = Math.max(requestedVersion, latestVersion ?? requestedVersion);
  const correlationId = `${input.periodType}:${window.periodKey}:${scopeKey}:v${calculationVersion}`;

  const selected = selectCandidatesForScope(await loadRankingParticipants(), input.scopeType, input.scopeKeyRaw);
  const candidates = [...new Map(selected.map(participant => [participant.userId, participant])).values()];

  const snapshot = { periodType: input.periodType, periodKey: window.periodKey, scopeType: input.scopeType, scopeKey, calculationVersion, userIds: candidates.map(candidate => candidate.userId), now: referenceDate };
  if (candidates.length === 0) {
    await getRepositories().rankingScores.finalizeScopeVersion(snapshot);
    await auditLog({
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

  const scored = computeRankingScores(gathered.map((entry) => ({ participant: entry.participant, metrics: entry.metrics })), config.rankingWeights);

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

  await repos.rankingScores.finalizeScopeVersion(snapshot);

  await auditLog({
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
  const discovered = discoverScopesFromParticipants(await loadRankingParticipants());
  const known = await getRepositories().rankingScores.listKnownScopes();
  const scopes = [...new Map([
    ...discovered,
    ...known.map(row => ({ scopeType: row.scopeType, scopeKeyRaw: row.scopeType === "GLOBAL" ? "global" : row.scopeKey.slice(row.scopeType.toLowerCase().length + 1) })),
  ].map(scope => [`${scope.scopeType}:${buildScopeKey(scope.scopeType, scope.scopeKeyRaw)}`, scope])).values()];
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
