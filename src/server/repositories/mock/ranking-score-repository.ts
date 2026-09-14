import type {
  FinalizeRankingScopeVersionInput,
  RankingPeriodType,
  RankingScopeType,
  RankingScoreEntity,
  RankingScoreRepository,
  RankingScoreUpsertInput,
} from "../contracts/ranking-score-repository";
import { mockStore } from "./mock-store";

/**
 * Implementação mock do ranking materializado (ADR-0011, Fase 9). Nenhum seed inicial — a
 * tabela só é populada por `recalculateRanking*` (`src/server/services/gamification/ranking`).
 *
 * `upsert` sobrescreve a linha em vigor da MESMA versão (ver nota de idempotência no
 * contrato) — diferente dos ledgers imutáveis (`PointTransaction`/`GamificationEvent`), que
 * nunca atualizam uma linha existente. Estado via `mockStore` (`./mock-store.ts`) —
 * compartilhado entre instâncias de módulo: sem isso, o recálculo de ranking via cron
 * (`/api/cron/ranking-recalc`, Fase 9) podia gravar numa instância e a leitura do ranking
 * (Server Component) não enxergar o resultado, por rodarem em instâncias de módulo separadas.
 */
const store = mockStore<RankingScoreEntity[]>("ranking-score", () => []);
const snapshots = mockStore<Array<Omit<FinalizeRankingScopeVersionInput, "userIds">>>("ranking-snapshots", () => []);
const sequence = mockStore<{ value: number }>("ranking-score:sequence", () => ({ value: 0 }));

function matchesScope(
  entry: Pick<RankingScoreEntity, "periodType" | "periodKey" | "scopeType" | "scopeKey">,
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
  async listKnownScopes(): Promise<Array<{ scopeType: RankingScopeType; scopeKey: string }>> {
    return [...new Map([...store, ...snapshots].map(row => [`${row.scopeType}:${row.scopeKey}`, { scopeType: row.scopeType, scopeKey: row.scopeKey }])).values()];
  }
  async finalizeScopeVersion(input: FinalizeRankingScopeVersionInput): Promise<void> {
    const ids = new Set(input.userIds);
    for (let index = store.length - 1; index >= 0; index -= 1) {
      const row = store[index]!;
      if (matchesScope(row, input.periodType, input.periodKey, input.scopeType, input.scopeKey) && row.calculationVersion === input.calculationVersion && !ids.has(row.userId)) store.splice(index, 1);
    }
    const index = snapshots.findIndex(row => matchesScope(row, input.periodType, input.periodKey, input.scopeType, input.scopeKey) && row.calculationVersion === input.calculationVersion);
    const snapshot = { periodType: input.periodType, periodKey: input.periodKey, scopeType: input.scopeType, scopeKey: input.scopeKey, calculationVersion: input.calculationVersion, now: input.now };
    if (index === -1) snapshots.push(snapshot); else snapshots[index] = snapshot;
  }

  async upsert(input: RankingScoreUpsertInput): Promise<RankingScoreEntity> {
    const index = store.findIndex(
      (entry) =>
        entry.userId === input.userId &&
        matchesScope(entry, input.periodType, input.periodKey, input.scopeType, input.scopeKey) &&
        entry.calculationVersion === input.calculationVersion,
    );

    const entity: RankingScoreEntity = {
      id: index >= 0 ? store[index]!.id : `ranking-score-mock-${(sequence.value += 1)}`,
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
      [...store, ...snapshots]
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
  store.splice(0, store.length);
  sequence.value = 0;
  snapshots.splice(0, snapshots.length);
}
