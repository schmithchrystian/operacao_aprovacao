import type {
  GamificationEventCreateInput,
  GamificationEventEntity,
  GamificationEventRepository,
} from "../contracts/gamification-event-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`gamification` a partir da
 * Fase de banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002). Modelo alvo: `GamificationEvent` (`prisma/schema.prisma`).
 */
export class PrismaGamificationEventRepository implements GamificationEventRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByIdempotencyKey(_key: string): Promise<GamificationEventEntity | null> {
    throw new Error("not implemented: PrismaGamificationEventRepository.findByIdempotencyKey");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: GamificationEventCreateInput): Promise<GamificationEventEntity> {
    throw new Error("not implemented: PrismaGamificationEventRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<GamificationEventEntity[]> {
    throw new Error("not implemented: PrismaGamificationEventRepository.listByUserId");
  }
}
