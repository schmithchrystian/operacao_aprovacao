import { mockGamificationEventSeed } from "@/mocks";
import type {
  GamificationEventCreateInput,
  GamificationEventEntity,
  GamificationEventRepository,
} from "../contracts/gamification-event-repository";

/**
 * Implementação mock do ledger de eventos de gamificação (ADR-0011, Fase 8).
 *
 * Estado em memória de PROCESSO (não sobrevive a reinícios nem é compartilhado entre
 * processos — limitação aceitável para mock; documentada também nos testes de "falha
 * transacional" da Fase 8). `create()` é a segunda barreira de idempotência (a primeira é o
 * `InMemoryEventBus`, `src/server/events`): mesmo chamado fora do bus, nunca duplica uma
 * `idempotencyKey` já processada.
 */
let store: GamificationEventEntity[] = [...mockGamificationEventSeed];
let sequence = store.length;

export class MockGamificationEventRepository implements GamificationEventRepository {
  async findByIdempotencyKey(key: string): Promise<GamificationEventEntity | null> {
    return store.find((event) => event.idempotencyKey === key) ?? null;
  }

  async create(input: GamificationEventCreateInput): Promise<GamificationEventEntity> {
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return existing;
    }

    sequence += 1;
    const event: GamificationEventEntity = {
      id: `gam-evt-mock-${sequence}`,
      userId: input.userId,
      type: input.type,
      idempotencyKey: input.idempotencyKey,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      points: input.points,
      xp: input.xp,
      ruleVersion: input.ruleVersion,
      context: input.context ?? null,
      status: input.status,
      createdAt: input.now.toISOString(),
    };
    store.push(event);
    return event;
  }

  async listByUserId(userId: string): Promise<GamificationEventEntity[]> {
    return store.filter((event) => event.userId === userId);
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockGamificationEventStore(): void {
  store = [...mockGamificationEventSeed];
  sequence = store.length;
}
