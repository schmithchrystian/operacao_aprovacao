import type {
  RankingPeriodType,
  RankingScopeType,
  RankingScoreEntity,
  RankingScoreRepository,
  RankingScoreUpsertInput,
} from "../contracts/ranking-score-repository";

/**
 * Implementação mock do ranking materializado (ADR-0011, Fase 9). Nenhum seed inicial — a
 * tabela só é populada por `recalculateRanking*` (`src/server/services/gamification/ranking`).
 *
 * `upsert` sobrescreve a linha em vigor da MESMA versão (ver nota de idempotência no
 * contrato) — diferente dos ledgers imutáveis (`PointTransaction`/`GamificationEvent`), que
 * nunca atualizam uma linha existente.
 */
let store: RankingScoreEntity[] = [];
let sequence = 0;

function matchesScope(
  entry: RankingScoreEntity,
  periodType: RankingPeriodType,
  periodKey: string,
  scopeType: RankingScopeType,
  scopeKey: string,
): boolean {
  return (
    entry.periodType === periodType &&
    entry.periodKey === periodKey &&
    entry.scopeType === scopeType &&
    entry.scopeKey === scopeKey
  );
}

export class MockRankingScoreRepository implements RankingScoreRepository {
  async upsert(input: RankingScoreUpsertInput): Promise<RankingScoreEntity> {
    const index = store.findIndex(
      (entry) =>
        entry.userId === input.userId &&
        matchesScope(entry, input.periodType, input.periodKey, input.scopeType, input.scopeKey) &&
        entry.calculationVersion === input.calculationVersion,
    );

    const entity: RankingScoreEntity = {
      id: index >= 0 ? store[index]!.id : `ranking-score-mock-${(sequence += 1)}`,
      userId: input.userId,
      periodType: input.periodType,
      periodKey: input.periodKey,
      scopeType: input.scopeType,
      scopeKey: input.scopeKey,
      calculationVersion: input.calculationVersion,
      score: input.score,
      rank: input.rank,
      breakdown: input.breakdown ?? null,
      calculatedAt: input.now.toISOString(),
    };

    if (index >= 0) {
      store[index] = entity;
    } else {
      store.push(entity);
    }
    return entity;
  }

  async listByScopeAndVersion(
    periodType: RankingPeriodType,
    periodKey: string,
    scopeType: RankingScopeType,
    scopeKey: string,
    calculationVersion: number,
  ): Promise<RankingScoreEntity[]> {
    return store.filter(
      (entry) =>
        matchesScope(entry, periodType, periodKey, scopeType, scopeKey) &&
        entry.calculationVersion === calculationVersion,
    );
  }

  async findLatestVersion(
    periodType: RankingPeriodType,
    periodKey: string,
    scopeType: RankingScopeType,
    scopeKey: string,
  ): Promise<number | null> {
    const versions = await this.listVersionsDesc(periodType, periodKey, scopeType, scopeKey);
    return versions[0] ?? null;
  }

  async listVersionsDesc(
    periodType: RankingPeriodType,
    periodKey: string,
    scopeType: RankingScopeType,
    scopeKey: string,
  ): Promise<number[]> {
    const versions = new Set(
      store
        .filter((entry) => matchesScope(entry, periodType, periodKey, scopeType, scopeKey))
        .map((entry) => entry.calculationVersion),
    );
    return [...versions].sort((a, b) => b - a);
  }

  async findByUserScopeAndVersion(
    userId: string,
    periodType: RankingPeriodType,
    periodKey: string,
    scopeType: RankingScopeType,
    scopeKey: string,
    calculationVersion: number,
  ): Promise<RankingScoreEntity | null> {
    return (
      store.find(
        (entry) =>
          entry.userId === userId &&
          matchesScope(entry, periodType, periodKey, scopeType, scopeKey) &&
          entry.calculationVersion === calculationVersion,
      ) ?? null
    );
  }
}

/** Uso exclusivo de testes — esvazia o store mock (não há seed inicial). */
export function __resetMockRankingScoreStore(): void {
  store = [];
  sequence = 0;
}
