import { mockBrainstormColumns } from "@/mocks";
import type {
  BrainstormColumnCreateInput,
  BrainstormColumnEntity,
  BrainstormColumnRepository,
} from "../contracts/brainstorm-column-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/brainstorm.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo. */
const store = mockStore<BrainstormColumnEntity[]>("brainstorm-column", () => [...mockBrainstormColumns]);
const sequence = mockStore<{ value: number }>("brainstorm-column:sequence", () => ({ value: store.length }));

export class MockBrainstormColumnRepository implements BrainstormColumnRepository {
  async findById(id: string): Promise<BrainstormColumnEntity | null> {
    return store.find((column) => column.id === id) ?? null;
  }

  async listByBoardId(boardId: string): Promise<BrainstormColumnEntity[]> {
    return store.filter((column) => column.boardId === boardId).sort((a, b) => a.order - b.order);
  }

  async createMany(inputs: BrainstormColumnCreateInput[]): Promise<BrainstormColumnEntity[]> {
    const created = inputs.map((input): BrainstormColumnEntity => {
      sequence.value += 1;
      const nowIso = input.now.toISOString();
      return {
        id: `brainstorm-column-mock-${sequence.value}`,
        boardId: input.boardId,
        name: input.name,
        order: input.order,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });
    store.push(...created);
    return created;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockBrainstormColumnStore(): void {
  store.splice(0, store.length, ...mockBrainstormColumns);
  sequence.value = store.length;
}
