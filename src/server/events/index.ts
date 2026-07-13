/**
 * Barramento de eventos de domínio (ADR-0007, CLAUDE.md §15).
 * Apenas infraestrutura: nenhum handler de gamificação/study-tracking é registrado aqui —
 * isso é responsabilidade dos agentes de domínio nas fases seguintes.
 *
 * TODO Fases futuras: outbox persistido (tabela) + consumidores idempotentes reais.
 */
export interface DomainEvent<TPayload = unknown> {
  /** Nome do evento, ex.: "LessonCompleted". */
  type: string;
  payload: TPayload;
  /** Chave de idempotência, ex.: `lesson-completed:<userId>:<lessonId>` (CLAUDE.md §15). */
  idempotencyKey: string;
  occurredAt: Date;
}

export type EventHandler<TPayload = unknown> = (
  event: DomainEvent<TPayload>,
) => Promise<void> | void;

export interface EventBus {
  /** Emite o evento; consumidores idempotentes não devem processar a mesma chave duas vezes. */
  emit<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
  /** Registra um consumidor para um tipo de evento. */
  subscribe<TPayload>(type: string, handler: EventHandler<TPayload>): void;
}

interface OutboxRecord {
  event: DomainEvent;
  processedAt: Date;
}

/** Implementação em memória do barramento — placeholder até existir outbox persistido. */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();
  private readonly processed = new Map<string, OutboxRecord>();

  async emit<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    if (this.processed.has(event.idempotencyKey)) {
      // Já processado: no-op idempotente.
      return;
    }

    const typeHandlers = this.handlers.get(event.type) ?? [];
    for (const handler of typeHandlers) {
      await handler(event as DomainEvent);
    }

    this.processed.set(event.idempotencyKey, {
      event: event as DomainEvent,
      processedAt: new Date(),
    });
  }

  subscribe<TPayload>(type: string, handler: EventHandler<TPayload>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as EventHandler);
    this.handlers.set(type, list);
  }

  /** Uso em testes/diagnóstico — não faz parte da interface pública `EventBus`. */
  hasProcessed(idempotencyKey: string): boolean {
    return this.processed.has(idempotencyKey);
  }
}

/** Instância única de processo — suficiente para o MVP sem runtime residente dedicado. */
export const eventBus: EventBus = new InMemoryEventBus();
