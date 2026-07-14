import type {
  UserAchievementEntity,
  UserAchievementRepository,
} from "../contracts/user-achievement-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`gamification` a partir da
 * Fase de banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002). Modelo alvo: `UserAchievement` (`prisma/schema.prisma`, chave composta
 * `@@id([userId, achievementId])` — usar `upsert`/`createMany({ skipDuplicates: true })` para
 * preservar a idempotência sem depender de leitura prévia).
 */
export class PrismaUserAchievementRepository implements UserAchievementRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<UserAchievementEntity[]> {
    throw new Error("not implemented: PrismaUserAchievementRepository.listByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByUserAndKey(_userId: string, _achievementKey: string): Promise<UserAchievementEntity | null> {
    throw new Error("not implemented: PrismaUserAchievementRepository.findByUserAndKey");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async unlock(_userId: string, _achievementKey: string, _now: Date): Promise<UserAchievementEntity> {
    throw new Error("not implemented: PrismaUserAchievementRepository.unlock");
  }
}
