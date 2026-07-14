import { mockPointTransactionSeed } from "@/mocks";
import type {
  PointTransactionCreateInput,
  PointTransactionEntity,
  PointTransactionRepository,
} from "../contracts/point-transaction-repository";

/**
 * Implementação mock do ledger IMUTÁVEL de pontos (ADR-0011, Fase 8). Ver
 * `./gamification-event-repository.ts` para as mesmas notas de idempotência/estado em memória.
 */
let store: PointTransactionEntity[] = [...mockPointTransactionSeed];
let sequence = store.length;

export class MockPointTransactionRepository implements PointTransactionRepository {
  async findByIdempotencyKey(key: string): Promise<PointTransactionEntity | null> {
    return store.find((transaction) => transaction.idempotencyKey === key) ?? null;
  }

  async create(input: PointTransactionCreateInput): Promise<PointTransactionEntity> {
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return existing;
    }

    sequence += 1;
    const transaction: PointTransactionEntity = {
      id: `pt-mock-${sequence}`,
      userId: input.userId,
      gamificationEventId: input.gamificationEventId,
      idempotencyKey: input.idempotencyKey,
      type: input.type,
      points: input.points,
      xp: input.xp,
      reason: input.reason,
      reversedTransactionId: input.reversedTransactionId ?? null,
      createdAt: input.now.toISOString(),
    };
    store.push(transaction);
    return transaction;
  }

  async listByUserId(userId: string): Promise<PointTransactionEntity[]> {
    return store.filter((transaction) => transaction.userId === userId);
  }

  async sumByUserId(userId: string): Promise<{ points: number; xp: number }> {
    return store
      .filter((transaction) => transaction.userId === userId)
      .reduce(
        (acc, transaction) => ({
          points: acc.points + transaction.points,
          xp: acc.xp + transaction.xp,
        }),
        { points: 0, xp: 0 },
      );
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockPointTransactionStore(): void {
  store = [...mockPointTransactionSeed];
  sequence = store.length;
}
