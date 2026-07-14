import type {
  PointTransactionCreateInput,
  PointTransactionEntity,
  PointTransactionRepository,
} from "../contracts/point-transaction-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`gamification` a partir da
 * Fase de banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002). Modelo alvo: `PointTransaction` (`prisma/schema.prisma`). A implementação real
 * DEVE gravar `GamificationEvent` + `PointTransaction` na MESMA transação de banco que o
 * evento de origem (ver TODO em `study-tracking/record-heartbeat.ts`), para eliminar a
 * janela de corrida que o mock (memória de processo) não cobre.
 */
export class PrismaPointTransactionRepository implements PointTransactionRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByIdempotencyKey(_key: string): Promise<PointTransactionEntity | null> {
    throw new Error("not implemented: PrismaPointTransactionRepository.findByIdempotencyKey");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: PointTransactionCreateInput): Promise<PointTransactionEntity> {
    throw new Error("not implemented: PrismaPointTransactionRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<PointTransactionEntity[]> {
    throw new Error("not implemented: PrismaPointTransactionRepository.listByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async sumByUserId(_userId: string): Promise<{ points: number; xp: number }> {
    throw new Error("not implemented: PrismaPointTransactionRepository.sumByUserId");
  }
}
