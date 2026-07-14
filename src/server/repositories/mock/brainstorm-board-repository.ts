import { mockBrainstormBoards } from "@/mocks";
import type {
  BrainstormBoardCreateInput,
  BrainstormBoardEntity,
  BrainstormBoardRepository,
} from "../contracts/brainstorm-board-repository";
import { mockStore } from "./mock-store";

/**
 * Implementação mock — seed inicial de `src/mocks/data/brainstorm.ts` (ADR-0011). Mesmo padrão
 * de `MockStudyPlanRepository`: array mutável em memória + contador de sequência para ids
 * novos (nunca `Math.random()`/`crypto.randomUUID()` — mantém a criação determinística e fácil
 * de testar). Estado via `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de
 * módulo (Next.js 16/Turbopack), nunca `let` de topo de módulo.
 */
const store = mockStore<BrainstormBoardEntity[]>("brainstorm-board", () => [...mockBrainstormBoards]);
const sequence = mockStore<{ value: number }>("brainstorm-board:sequence", () => ({ value: store.length }));

export class MockBrainstormBoardRepository implements BrainstormBoardRepository {
  async findById(id: string): Promise<BrainstormBoardEntity | null> {
    return store.find((board) => board.id === id) ?? null;
  }

  async listByUserId(userId: string): Promise<BrainstormBoardEntity[]> {
    return store.filter((board) => board.userId === userId);
  }

  async create(input: BrainstormBoardCreateInput): Promise<BrainstormBoardEntity> {
    sequence.value += 1;
    const nowIso = input.now.toISOString();
    const board: BrainstormBoardEntity = {
      id: `brainstorm-board-mock-${sequence.value}`,
      userId: input.userId,
      title: input.title,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    store.push(board);
    return board;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockBrainstormBoardStore(): void {
  store.splice(0, store.length, ...mockBrainstormBoards);
  sequence.value = store.length;
}
