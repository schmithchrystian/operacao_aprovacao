import { RANKING_WEIGHTS } from "@/config/business";
import type { RankingBreakdown, RankingMetricBreakdownEntry } from "@/server/repositories/contracts/ranking-score-repository";

/**
 * Fórmula + normalização do ranking (Fase 9 — agente `gamification`, CLAUDE.md §17).
 *
 * Regra dura: NUNCA usar só pontos totais. Cada métrica é normalizada (min-max) dentro do
 * PRÓPRIO conjunto de participantes do escopo antes de entrar na soma ponderada — isso é o
 * que impede uma métrica de valor absoluto grande (ex.: milhares de questões corretas)
 * dominar o score sozinha, e também dificulta "farm" de uma única métrica (o ganho marginal
 * de uma métrica já no topo do escopo tende a zero, porque ela já está normalizada perto de 1).
 */

/** Métricas brutas (antes de normalizar) usadas pela fórmula — pluggável: cada fonte (aulas,
 *  simulados, constância, tempo válido, metas) pode ser recalculada/substituída de forma
 *  independente pelas fases futuras (Fase 10 `simulations`, Fases 11/12/15 `study-tracking`)
 *  sem alterar esta função, que só conhece o formato `RankingRawMetrics`. */
export interface RankingRawMetrics {
  /** Aproveitamento em simulados, 0-100. */
  mockExamPerformance: number;
  /** Nº de aulas concluídas no período/escopo. */
  lessonsCompleted: number;
  /** Constância, 0-1 (fração de dias ativos no período). */
  consistency: number;
  /** Tempo válido de estudo, em horas. */
  validHours: number;
  /** Nº de metas concluídas no período. */
  goalsCompleted: number;
}

export type RankingWeights = { [K in keyof typeof RANKING_WEIGHTS]: number };

export interface ScoredRankingEntry<TParticipant> {
  participant: TParticipant;
  metrics: RankingRawMetrics;
  score: number;
  breakdown: RankingBreakdown["metrics"];
}

/**
 * Normalização min-max pura. Quando não há variância no conjunto (todos os valores iguais,
 * `max === min`), devolve 0 para todos — decisão deliberada: nesse caso a métrica não
 * diferencia ninguém dentro do escopo, e devolver 0 (em vez de `NaN` ou 0.5 arbitrário) evita
 * favorecer alguém sem uma base real de comparação.
 */
export function normalizeMinMax(values: readonly number[]): number[] {
  if (values.length === 0) {
    return [];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) {
    return values.map(() => 0);
  }
  return values.map((value) => (value - min) / range);
}

function buildEntry(raw: number, normalized: number, weight: number): RankingMetricBreakdownEntry {
  return { raw, normalized, weight, contribution: normalized * weight };
}

/**
 * Calcula o `score` composto (0-1) de cada participante do escopo. TODA normalização é feita
 * sobre o conjunto INTEIRO recebido (o escopo já resolvido) — nunca sobre um subconjunto de
 * página, para não distorcer a comparação (CLAUDE.md §17).
 */
export function computeRankingScores<TParticipant>(
  entries: ReadonlyArray<{ participant: TParticipant; metrics: RankingRawMetrics }>,
  weights: RankingWeights = RANKING_WEIGHTS,
): ScoredRankingEntry<TParticipant>[] {
  if (entries.length === 0) {
    return [];
  }

  const mockExamValues = normalizeMinMax(entries.map((entry) => entry.metrics.mockExamPerformance));
  const lessonsValues = normalizeMinMax(entries.map((entry) => entry.metrics.lessonsCompleted));
  const consistencyValues = normalizeMinMax(entries.map((entry) => entry.metrics.consistency));
  const validHoursValues = normalizeMinMax(entries.map((entry) => entry.metrics.validHours));
  const goalsValues = normalizeMinMax(entries.map((entry) => entry.metrics.goalsCompleted));

  return entries.map((entry, index) => {
    const breakdown: RankingBreakdown["metrics"] = {
      mockExamPerformance: buildEntry(
        entry.metrics.mockExamPerformance,
        mockExamValues[index]!,
        weights.simuladoPerformance,
      ),
      lessonsCompleted: buildEntry(
        entry.metrics.lessonsCompleted,
        lessonsValues[index]!,
        weights.lessonsCompleted,
      ),
      consistency: buildEntry(entry.metrics.consistency, consistencyValues[index]!, weights.consistency),
      validHours: buildEntry(entry.metrics.validHours, validHoursValues[index]!, weights.validTime),
      goalsCompleted: buildEntry(entry.metrics.goalsCompleted, goalsValues[index]!, weights.goalsCompleted),
    };

    const score =
      breakdown.mockExamPerformance.contribution +
      breakdown.lessonsCompleted.contribution +
      breakdown.consistency.contribution +
      breakdown.validHours.contribution +
      breakdown.goalsCompleted.contribution;

    return { participant: entry.participant, metrics: entry.metrics, score, breakdown };
  });
}
