/**
 * Entidade de domínio de revisão de flashcard (`FlashcardReview`, docs/DATA-MODEL.md). Fase 14 —
 * agente `backend`. APPEND-ONLY (docs/DATA-MODEL.md: "uma linha por revisão") — nunca há
 * `update`/`delete` nesta interface; a "revisão mais recente" de um cartão é sempre a de maior
 * `reviewedAt` entre as linhas de `(userId, flashcardId)`.
 *
 * Espelha `FlashcardReviewRating` do Prisma. Guarda os parâmetros do algoritmo "SM-2
 * simplificado" (`@/server/services/flashcards/spaced-repetition.ts`) resultantes de CADA
 * revisão — `easeFactor`/`intervalDays`/`repetition` são o ESTADO PÓS-revisão (não a entrada).
 */
export type FlashcardReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface FlashcardReviewEntity {
  id: string;
  userId: string;
  flashcardId: string;
  rating: FlashcardReviewRating;
  intervalDays: number;
  easeFactor: number;
  repetition: number;
  /** ISO 8601 — quando a revisão foi registrada (= `now` injetado pelo serviço). */
  reviewedAt: string;
  /** ISO 8601 — quando o cartão volta a ficar devido. */
  nextReviewAt: string;
}

export interface FlashcardReviewCreateInput {
  userId: string;
  flashcardId: string;
  rating: FlashcardReviewRating;
  intervalDays: number;
  easeFactor: number;
  repetition: number;
  nextReviewAt: string;
  /** `reviewedAt` é sempre `now.toISOString()` — nunca lido do cliente. */
  now: Date;
}

/** Abstração de persistência para revisões de flashcards (ADR-0002). */
export interface FlashcardReviewRepository {
  /** A revisão mais recente de `(userId, flashcardId)`, ou `null` se o cartão nunca foi
   *  revisado por este usuário (cartão "novo" — devido imediatamente). */
  findLatestByUserAndFlashcard(userId: string, flashcardId: string): Promise<FlashcardReviewEntity | null>;
  /**
   * A revisão mais recente de CADA cartão em `flashcardIds` que este usuário já revisou pelo
   * menos uma vez (lote — evita 1 query por cartão em `listDecks`/`getReviewSession`). Cartões
   * sem nenhuma revisão simplesmente não aparecem no array retornado (o CHAMADOR trata a
   * ausência como "novo, devido agora").
   */
  listLatestByUserIdForFlashcardIds(userId: string, flashcardIds: string[]): Promise<FlashcardReviewEntity[]>;
  /** Histórico COMPLETO de revisões do usuário (qualquer cartão) — usado por `getRetentionStats`. */
  listByUserId(userId: string): Promise<FlashcardReviewEntity[]>;
  create(input: FlashcardReviewCreateInput): Promise<FlashcardReviewEntity>;
}
