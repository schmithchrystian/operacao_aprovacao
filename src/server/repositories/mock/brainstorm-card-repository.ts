import { mockBrainstormCards } from "@/mocks";
import type {
  BrainstormCardCreateInput,
  BrainstormCardEntity,
  BrainstormCardRepository,
  BrainstormCardUpdateInput,
} from "../contracts/brainstorm-card-repository";

/** Implementação mock — seed inicial de `src/mocks/data/brainstorm.ts` (ADR-0011). */
let store: BrainstormCardEntity[] = [...mockBrainstormCards];
let sequence = store.length;

export class MockBrainstormCardRepository implements BrainstormCardRepository {
  async findById(id: string): Promise<BrainstormCardEntity | null> {
    return store.find((card) => card.id === id) ?? null;
  }

  async listByColumnIds(columnIds: string[]): Promise<BrainstormCardEntity[]> {
    const idSet = new Set(columnIds);
    const matches = store.filter((card) => idSet.has(card.columnId));
    // Agrupado por coluna (na ordem de `columnIds`) e, DENTRO de cada coluna, por `order`
    // crescente — nunca uma ordenação global pelo valor bruto de `order` (que só é único
    // dentro de uma mesma coluna; colunas diferentes reusam os mesmos valores 0,1,2,...).
    const columnRank = new Map(columnIds.map((id, index) => [id, index]));
    return matches.sort((a, b) => {
      const columnDiff = (columnRank.get(a.columnId) ?? 0) - (columnRank.get(b.columnId) ?? 0);
      return columnDiff !== 0 ? columnDiff : a.order - b.order;
    });
  }

  async create(input: BrainstormCardCreateInput): Promise<BrainstormCardEntity> {
    sequence += 1;
    const nowIso = input.now.toISOString();
    const card: BrainstormCardEntity = {
      id: `brainstorm-card-mock-${sequence}`,
      columnId: input.columnId,
      type: input.type,
      title: input.title,
      content: input.content,
      tags: input.tags,
      subjectId: input.subjectId,
      topicId: input.topicId,
      priority: input.priority,
      status: "OPEN",
      order: input.order,
      convertedFlashcardId: null,
      convertedStudyPlanItemId: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    store.push(card);
    return card;
  }

  async update(input: BrainstormCardUpdateInput): Promise<BrainstormCardEntity> {
    const index = store.findIndex((card) => card.id === input.id);
    if (index < 0) {
      throw new Error(`[mocks/brainstorm-card] Cartão não encontrado: ${input.id}`);
    }
    const current = store[index]!;
    const nowIso = input.now.toISOString();
    const updated: BrainstormCardEntity = {
      ...current,
      type: input.type ?? current.type,
      title: input.title ?? current.title,
      content: input.content === undefined ? current.content : input.content,
      tags: input.tags ?? current.tags,
      subjectId: input.subjectId === undefined ? current.subjectId : input.subjectId,
      topicId: input.topicId === undefined ? current.topicId : input.topicId,
      priority: input.priority ?? current.priority,
      status: input.status ?? current.status,
      convertedFlashcardId:
        input.convertedFlashcardId === undefined ? current.convertedFlashcardId : input.convertedFlashcardId,
      convertedStudyPlanItemId:
        input.convertedStudyPlanItemId === undefined
          ? current.convertedStudyPlanItemId
          : input.convertedStudyPlanItemId,
      updatedAt: nowIso,
    };
    store[index] = updated;
    return updated;
  }

  async reorderColumn(columnId: string, orderedCardIds: string[], now: Date): Promise<BrainstormCardEntity[]> {
    const nowIso = now.toISOString();
    const positionById = new Map(orderedCardIds.map((id, index) => [id, index]));
    store = store.map((card) => {
      if (card.columnId !== columnId) return card;
      const newOrder = positionById.get(card.id);
      // Cartão não incluído em `orderedCardIds` (não deveria ocorrer — o serviço sempre passa o
      // conjunto completo da coluna) ou já na posição correta: sem alteração (idempotência).
      if (newOrder === undefined || newOrder === card.order) return card;
      return { ...card, order: newOrder, updatedAt: nowIso };
    });
    return store.filter((card) => card.columnId === columnId).sort((a, b) => a.order - b.order);
  }

  async moveToColumn(cardId: string, toColumnId: string, now: Date): Promise<BrainstormCardEntity> {
    const index = store.findIndex((card) => card.id === cardId);
    if (index < 0) {
      throw new Error(`[mocks/brainstorm-card] Cartão não encontrado: ${cardId}`);
    }
    const current = store[index]!;
    if (current.columnId === toColumnId) {
      return current; // Idempotente — já está na coluna destino, nada a fazer.
    }
    const updated: BrainstormCardEntity = { ...current, columnId: toColumnId, updatedAt: now.toISOString() };
    store[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<void> {
    store = store.filter((card) => card.id !== id);
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockBrainstormCardStore(): void {
  store = [...mockBrainstormCards];
  sequence = store.length;
}
