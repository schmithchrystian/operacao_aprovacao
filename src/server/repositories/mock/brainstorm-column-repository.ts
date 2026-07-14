import { mockBrainstormColumns } from "@/mocks";
import type {
  BrainstormColumnCreateInput,
  BrainstormColumnEntity,
  BrainstormColumnRepository,
} from "../contracts/brainstorm-column-repository";

/** Implementação mock — seed inicial de `src/mocks/data/brainstorm.ts` (ADR-0011). */
let store: BrainstormColumnEntity[] = [...mockBrainstormColumns];
let sequence = store.length;

export class MockBrainstormColumnRepository implements BrainstormColumnRepository {
  async findById(id: string): Promise<BrainstormColumnEntity | null> {
    return store.find((column) => column.id === id) ?? null;
  }

  async listByBoardId(boardId: string): Promise<BrainstormColumnEntity[]> {
    return store.filter((column) => column.boardId === boardId).sort((a, b) => a.order - b.order);
  }

  async createMany(inputs: BrainstormColumnCreateInput[]): Promise<BrainstormColumnEntity[]> {
    const created = inputs.map((input): BrainstormColumnEntity => {
      sequence += 1;
      const nowIso = input.now.toISOString();
      return {
        id: `brainstorm-column-mock-${sequence}`,
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
  store = [...mockBrainstormColumns];
  sequence = store.length;
}
