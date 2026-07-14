import { mockQuestionAttempts } from "@/mocks";
import type {
  QuestionAttemptCreateInput,
  QuestionAttemptEntity,
  QuestionAttemptRepository,
} from "../contracts/question-attempt-repository";

/**
 * Implementação mock — seed inicial de `src/mocks/data/mock-exam-attempts.ts` (ADR-0011).
 *
 * `upsertForMockExamAttempt` espelha a constraint `@@unique([mockExamAttemptId, questionId])`
 * do schema (docs/DATA-MODEL.md) apenas quando `mockExamAttemptId` não é nulo — chamar de novo
 * para a mesma questão da mesma tentativa atualiza o registro em vez de duplicar.
 */
let store: QuestionAttemptEntity[] = [...mockQuestionAttempts];
let sequence = store.length;

export class MockQuestionAttemptRepository implements QuestionAttemptRepository {
  async listByMockExamAttemptId(mockExamAttemptId: string): Promise<QuestionAttemptEntity[]> {
    return store.filter((attempt) => attempt.mockExamAttemptId === mockExamAttemptId);
  }

  async listByUserId(userId: string): Promise<QuestionAttemptEntity[]> {
    return store.filter((attempt) => attempt.userId === userId);
  }

  async upsertForMockExamAttempt(input: QuestionAttemptCreateInput): Promise<QuestionAttemptEntity> {
    const nowIso = input.now.toISOString();
    const index =
      input.mockExamAttemptId !== null
        ? store.findIndex(
            (attempt) =>
              attempt.mockExamAttemptId === input.mockExamAttemptId && attempt.questionId === input.questionId,
          )
        : -1;

    const entity: QuestionAttemptEntity = {
      id: index >= 0 ? store[index]!.id : `qattempt-mock-${(sequence += 1)}`,
      userId: input.userId,
      questionId: input.questionId,
      mockExamAttemptId: input.mockExamAttemptId,
      selectedOptionId: input.selectedOptionId,
      isCorrect: input.isCorrect,
      timeSpentSeconds: input.timeSpentSeconds,
      answeredAt: nowIso,
    };

    if (index >= 0) {
      store[index] = entity;
    } else {
      store.push(entity);
    }
    return entity;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockQuestionAttemptStore(): void {
  store = [...mockQuestionAttempts];
  sequence = store.length;
}
