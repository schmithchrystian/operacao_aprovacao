// Fórmula + normalização (CLAUDE.md §17) — nunca usa só pontos totais.
export {
  normalizeMinMax,
  computeRankingScores,
  type RankingRawMetrics,
  type RankingWeights,
  type ScoredRankingEntry,
} from "./formula";

// Desempate determinístico.
export { compareRankingEntries, type RankingTieBreakInput } from "./tiebreak";

// Períodos, escopos e chaves (RankingScore periodKey/scopeKey).
export {
  buildPeriodWindow,
  buildScopeKey,
  selectCandidatesForScope,
  discoverScopesFromParticipants,
  type RankingPeriodWindow,
  type RankingPeriodType,
  type RankingScopeType,
} from "./scope";

// Coleta de métricas (real quando existe fonte; mock com TODO quando não existe ainda).
export { gatherRawMetrics, type RankingGatheredMetrics } from "./metrics";

// Recálculo/materialização (`RankingScore`) — único ponto de escrita.
export {
  recalculateRankingForScope,
  recalculateAllRankingScopes,
  type RecalculateRankingScopeInput,
  type RecalculateRankingScopeResult,
} from "./recalculate";

// Leitura (cache-only) — respeita privacidade e devolve a posição do usuário mesmo fora da página.
export {
  getRanking,
  getUserRankingPosition,
  anonymizedRankingName,
  type GetRankingInput,
  type RankingListEntryDTO,
  type RankingReadResult,
  type RankingPositionSummary,
} from "./read";
