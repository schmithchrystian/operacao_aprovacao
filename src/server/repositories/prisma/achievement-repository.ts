import type {
  AchievementCreateInput,
  AchievementEntity,
  AchievementRepository,
  AchievementUpdateInput,
} from "../contracts/achievement-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaAchievementRepository implements AchievementRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<AchievementEntity | null> {
    throw new Error("not implemented: PrismaAchievementRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByKey(_key: string): Promise<AchievementEntity | null> {
    throw new Error("not implemented: PrismaAchievementRepository.findByKey");
  }

  async list(): Promise<AchievementEntity[]> {
    throw new Error("not implemented: PrismaAchievementRepository.list");
  }

  async listForAdmin(): Promise<AchievementEntity[]> {
    throw new Error("not implemented: PrismaAchievementRepository.listForAdmin");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: AchievementCreateInput): Promise<AchievementEntity> {
    throw new Error("not implemented: PrismaAchievementRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: AchievementUpdateInput): Promise<AchievementEntity> {
    throw new Error("not implemented: PrismaAchievementRepository.update");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async softDelete(_id: string, _now: Date): Promise<AchievementEntity> {
    throw new Error("not implemented: PrismaAchievementRepository.softDelete");
  }
}
