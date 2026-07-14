/**
 * Entidade de domínio de resposta a uma questão (`QuestionAttempt`, docs/DATA-MODEL.md).
 * `isCorrect` é calculado e gravado exclusivamente pelo servidor na correção
 * (`src/server/services/simulations/submit-and-finalize.ts`) — nunca recebido do cliente.
 */
export interface QuestionAttemptEntity {
  id: string;
  userId: string;
  questionId: string;
  /** `null` fora do contexto de uma tentativa de simulado (prática avulsa — fora do escopo desta fase). */
  mockExamAttemptId: string | null;
  /** `null` = questão não respondida (em branco). */
  selectedOptionId: string | null;
  /** `null` quando não respondida; nunca um valor vindo do cliente. */
  isCorrect: boolean | null;
  timeSpentSeconds: number | null;
  /** ISO 8601. */
  answeredAt: string;
}

export interface QuestionAttemptCreateInput {
  userId: string;
  questionId: string;
  mockExamAttemptId: string | null;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
  timeSpentSeconds: number | null;
  now: Date;
}

/** Abstração de persistência para respostas de questão (ADR-0002). */
export interface QuestionAttemptRepository {
  listByMockExamAttemptId(mockExamAttemptId: string): Promise<QuestionAttemptEntity[]>;
  listByUserId(userId: string): Promise<QuestionAttemptEntity[]>;
  /**
   * Grava a resposta corrigida. IDEMPOTENTE por `(mockExamAttemptId, questionId)` quando
   * `mockExamAttemptId` não é nulo (mesma `@@unique` do schema, docs/DATA-MODEL.md) — chamar de
   * novo para a mesma questão da mesma tentativa atualiza o registro existente em vez de
   * duplicar (só pode acontecer na prática se `submitAndFinalize` for chamado de novo ANTES da
   * guarda de `finalize` rejeitar — nunca depois, já que a guarda de concorrência otimista é o
   * ponto de corte real).
   */
  upsertForMockExamAttempt(input: QuestionAttemptCreateInput): Promise<QuestionAttemptEntity>;
}
