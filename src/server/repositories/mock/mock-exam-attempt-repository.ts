import { mockMockExamAttempts } from "@/mocks";
import type {
  MockExamAttemptCreateInput,
  MockExamAttemptEntity,
  MockExamAttemptExpireInput,
  MockExamAttemptFinalizeInput,
  MockExamAttemptRepository,
} from "../contracts/mock-exam-attempt-repository";

/**
 * Implementação mock — seed inicial de `src/mocks/data/mock-exam-attempts.ts` (ADR-0011).
 *
 * `finalize`/`expire` simulam a guarda de concorrência otimista real do Prisma
 * (`UPDATE ... WHERE id = ? AND status = 'IN_PROGRESS' AND version = ?`, docs/DATA-MODEL.md §5):
 * só aplicam a transição quando o registro AINDA está `IN_PROGRESS` e `version` bate com
 * `expectedVersion`; caso contrário devolvem `null` (0 linhas afetadas), nunca lançando exceção
 * — quem decide o que fazer com "nada mudou" é o service (`submitAndFinalize`), que trata como
 * rejeição (CLAUDE.md §18/§25: "tentativa finalizada não pode ser finalizada novamente").
 */
let store: MockExamAttemptEntity[] = [...mockMockExamAttempts];
let sequence = store.length;

export class MockMockExamAttemptRepository implements MockExamAttemptRepository {
  async findById(id: string): Promise<MockExamAttemptEntity | null> {
    return store.find((attempt) => attempt.id === id) ?? null;
  }

  async listByUserId(userId: string): Promise<MockExamAttemptEntity[]> {
    return store.filter((attempt) => attempt.userId === userId);
  }

  async create(input: MockExamAttemptCreateInput): Promise<MockExamAttemptEntity> {
    sequence += 1;
    const nowIso = input.now.toISOString();
    const attempt: MockExamAttemptEntity = {
      id: `attempt-mock-${sequence}`,
      userId: input.userId,
      mockExamId: input.mockExamId,
      status: "IN_PROGRESS",
      startedAt: nowIso,
      finishedAt: null,
      timeLimitSeconds: input.timeLimitSeconds,
      correctCount: null,
      wrongCount: null,
      blankCount: null,
      scorePercent: null,
      version: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    store.push(attempt);
    return attempt;
  }

  async finalize(input: MockExamAttemptFinalizeInput): Promise<MockExamAttemptEntity | null> {
    const index = store.findIndex(
      (attempt) =>
        attempt.id === input.id && attempt.status === "IN_PROGRESS" && attempt.version === input.expectedVersion,
    );
    if (index < 0) {
      return null;
    }

    const current = store[index]!;
    const updated: MockExamAttemptEntity = {
      ...current,
      status: "FINISHED",
      finishedAt: input.now.toISOString(),
      correctCount: input.correctCount,
      wrongCount: input.wrongCount,
      blankCount: input.blankCount,
      scorePercent: input.scorePercent,
      version: current.version + 1,
      updatedAt: input.now.toISOString(),
    };
    store[index] = updated;
    return updated;
  }

  async expire(input: MockExamAttemptExpireInput): Promise<MockExamAttemptEntity | null> {
    const index = store.findIndex(
      (attempt) =>
        attempt.id === input.id && attempt.status === "IN_PROGRESS" && attempt.version === input.expectedVersion,
    );
    if (index < 0) {
      return null;
    }

    const current = store[index]!;
    const updated: MockExamAttemptEntity = {
      ...current,
      status: "EXPIRED",
      finishedAt: input.now.toISOString(),
      version: current.version + 1,
      updatedAt: input.now.toISOString(),
    };
    store[index] = updated;
    return updated;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockMockExamAttemptStore(): void {
  store = [...mockMockExamAttempts];
  sequence = store.length;
}
