/**
 * Status da tentativa (`MockExamAttempt`, docs/DATA-MODEL.md). Espelha
 * `MockExamAttemptStatus` do Prisma (mantidos sincronizados).
 */
export type MockExamAttemptStatus = "IN_PROGRESS" | "FINISHED" | "EXPIRED" | "CANCELLED";

export interface MockExamAttemptEntity {
  id: string;
  userId: string;
  mockExamId: string;
  status: MockExamAttemptStatus;
  /** ISO 8601 — registrado pelo SERVIDOR na criação (CLAUDE.md §18: "início registrado no servidor"). */
  startedAt: string;
  /** ISO 8601, ou `null` enquanto `IN_PROGRESS`. */
  finishedAt: string | null;
  /** `null` = sem limite de tempo. Nunca populado a partir de um valor do cliente. */
  timeLimitSeconds: number | null;
  correctCount: number | null;
  wrongCount: number | null;
  blankCount: number | null;
  /** Percentual 0–100 (convenção de escala, docs/DATA-MODEL.md — distinta da fração 0–1 de `LessonProgress`). */
  scorePercent: number | null;
  /** Concorrência otimista (docs/DATA-MODEL.md §5) — incrementada a cada finalização/expiração. */
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface MockExamAttemptCreateInput {
  userId: string;
  mockExamId: string;
  timeLimitSeconds: number | null;
  /** Relógio injetado pelo chamador — nunca `Date.now()`/`new Date()` direto no repositório. */
  now: Date;
}

/**
 * Entrada de finalização. `expectedVersion` é o `version` lido pelo service ANTES de corrigir —
 * a implementação só aplica quando o registro ainda está `IN_PROGRESS` E `version` bate com
 * `expectedVersion` (guarda anti-dupla-finalização por concorrência otimista, docs/DATA-MODEL.md
 * §5: `UPDATE ... WHERE id = ? AND status = 'IN_PROGRESS' AND version = ?`).
 */
export interface MockExamAttemptFinalizeInput {
  id: string;
  expectedVersion: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  scorePercent: number;
  now: Date;
}

/** Entrada de expiração (tempo esgotado) — mesma guarda de concorrência otimista que `finalize`. */
export interface MockExamAttemptExpireInput {
  id: string;
  expectedVersion: number;
  now: Date;
}

/** Abstração de persistência para tentativas de simulado (ADR-0002, CLAUDE.md §18/§25). */
export interface MockExamAttemptRepository {
  findById(id: string): Promise<MockExamAttemptEntity | null>;
  listByUserId(userId: string): Promise<MockExamAttemptEntity[]>;
  create(input: MockExamAttemptCreateInput): Promise<MockExamAttemptEntity>;
  /**
   * Finaliza a tentativa. Retorna `null` (0 linhas afetadas) quando o registro já não está
   * `IN_PROGRESS` ou `version` não bate — o service DEVE tratar isso como rejeição (nunca
   * repontuar, nunca gravar `QuestionAttempt`/emitir gamificação para uma chamada perdedora).
   */
  finalize(input: MockExamAttemptFinalizeInput): Promise<MockExamAttemptEntity | null>;
  /** Mesma semântica de `finalize`, mas transiciona para `EXPIRED` (tempo esgotado, sem nota). */
  expire(input: MockExamAttemptExpireInput): Promise<MockExamAttemptEntity | null>;
}
