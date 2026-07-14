import { mockBrainstormBoards } from "@/mocks";
import type {
  BrainstormBoardCreateInput,
  BrainstormBoardEntity,
  BrainstormBoardRepository,
} from "../contracts/brainstorm-board-repository";

/**
 * Implementação mock — seed inicial de `src/mocks/data/brainstorm.ts` (ADR-0011). Mesmo padrão
 * de `MockStudyPlanRepository`: array mutável em memória + contador de sequência para ids
 * novos (nunca `Math.random()`/`crypto.randomUUID()` — mantém a criação determinística e fácil
 * de testar).
 */
let store: BrainstormBoardEntity[] = [...mockBrainstormBoards];
let sequence = store.length;

export class MockBrainstormBoardRepository implements BrainstormBoardRepository {
  async findById(id: string): Promise<BrainstormBoardEntity | null> {
    return store.find((board) => board.id === id) ?? null;
  }

  async listByUserId(userId: string): Promise<BrainstormBoardEntity[]> {
    return store.filter((board) => board.userId === userId);
  }

  async create(input: BrainstormBoardCreateInput): Promise<BrainstormBoardEntity> {
    sequence += 1;
    const nowIso = input.now.toISOString();
    const board: BrainstormBoardEntity = {
      id: `brainstorm-board-mock-${sequence}`,
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
  store = [...mockBrainstormBoards];
  sequence = store.length;
}
