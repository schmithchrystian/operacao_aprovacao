import type {
  RankingPeriodType,
  RankingScopeType,
  RankingScoreEntity,
  RankingScoreRepository,
  RankingScoreUpsertInput,
} from "../contracts/ranking-score-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`gamification` a partir da
 * Fase de banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002). Modelo alvo: `RankingScore` (`prisma/schema.prisma`), único por
 * `(userId, periodType, periodKey, scopeType, scopeKey, calculationVersion)`. A implementação
 * real deve usar `prisma.rankingScore.upsert` sobre essa chave composta (mesma semântica do
 * mock: sobrescreve a linha em vigor da mesma versão, nunca duplica).
 */
export class PrismaRankingScoreRepository implements RankingScoreRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async upsert(_input: RankingScoreUpsertInput): Promise<RankingScoreEntity> {
    throw new Error("not implemented: PrismaRankingScoreRepository.upsert");
  }

  async listByScopeAndVersion(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _periodType: RankingPeriodType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _periodKey: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _scopeType: RankingScopeType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _scopeKey: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _calculationVersion: number,
  ): Promise<RankingScoreEntity[]> {
    throw new Error("not implemented: PrismaRankingScoreRepository.listByScopeAndVersion");
  }

  async findLatestVersion(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _periodType: RankingPeriodType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _periodKey: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _scopeType: RankingScopeType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _scopeKey: string,
  ): Promise<number | null> {
    throw new Error("not implemented: PrismaRankingScoreRepository.findLatestVersion");
  }

  async listVersionsDesc(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _periodType: RankingPeriodType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _periodKey: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _scopeType: RankingScopeType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _scopeKey: string,
  ): Promise<number[]> {
    throw new Error("not implemented: PrismaRankingScoreRepository.listVersionsDesc");
  }

  async findByUserScopeAndVersion(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _periodType: RankingPeriodType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _periodKey: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _scopeType: RankingScopeType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _scopeKey: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
    _calculationVersion: number,
  ): Promise<RankingScoreEntity | null> {
    throw new Error("not implemented: PrismaRankingScoreRepository.findByUserScopeAndVersion");
  }
}
