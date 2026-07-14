import { mockPointTransactionSeed } from "@/mocks";
import type {
  PointTransactionCreateInput,
  PointTransactionEntity,
  PointTransactionRepository,
} from "../contracts/point-transaction-repository";
import { mockStore } from "./mock-store";

/**
 * Implementação mock do ledger IMUTÁVEL de pontos (ADR-0011, Fase 8). Ver
 * `./gamification-event-repository.ts` para as mesmas notas de idempotência/estado em memória.
 * Estado via `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo.
 */
const store = mockStore<PointTransactionEntity[]>("point-transaction", () => [...mockPointTransactionSeed]);
const sequence = mockStore<{ value: number }>("point-transaction:sequence", () => ({ value: store.length }));

export class MockPointTransactionRepository implements PointTransactionRepository {
  async findByIdempotencyKey(key: string): Promise<PointTransactionEntity | null> {
    return store.find((transaction) => transaction.idempotencyKey === key) ?? null;
  }

  async create(input: PointTransactionCreateInput): Promise<PointTransactionEntity> {
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return existing;
    }

    sequence.value += 1;
    const transaction: PointTransactionEntity = {
      id: `pt-mock-${sequence.value}`,
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
  store.splice(0, store.length, ...mockPointTransactionSeed);
  sequence.value = store.length;
}
