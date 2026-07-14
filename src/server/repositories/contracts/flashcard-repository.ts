/**
 * Entidade de domínio de flashcard (`Flashcard`, docs/DATA-MODEL.md). Fase 14 — agente
 * `backend`. Espelha `Difficulty`/`ContentStatus` do Prisma (mantidos sincronizados, mesmo
 * padrão de `QuestionEntity`, `@/server/repositories/contracts/question-repository`).
 */
export type FlashcardDifficulty = "EASY" | "MEDIUM" | "HARD";
export type FlashcardStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface FlashcardEntity {
  id: string;
  deckId: string;
  subjectId: string | null;
  topicId: string | null;
  question: string;
  answer: string;
  difficulty: FlashcardDifficulty;
  /**
   * Tags genuínas do aluno/conteúdo E, quando aplicável, marcações internas de proveniência
   * reservadas (`src:error:<questionId>` / `src:note:<draftId>` — ver
   * `@/server/services/flashcards/shared.ts#RESERVED_TAG_PREFIX`), usadas só para
   * `createFromErrors`/`createFromNotes` não reimportar o mesmo item duas vezes. As reservadas
   * são SEMPRE filtradas antes de virar `FlashcardDTO.tags` (nunca vazam para o cliente).
   */
  tags: string[];
  status: FlashcardStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FlashcardCreateInput {
  deckId: string;
  subjectId: string | null;
  topicId: string | null;
  question: string;
  answer: string;
  difficulty: FlashcardDifficulty;
  tags: string[];
  now: Date;
}

/** Abstração de persistência para flashcards (ADR-0002). Só leitura de publicados/não-excluídos
 *  (mesmo padrão de `QuestionRepository.list` — `status`/`deletedAt` aplicados pelo repositório,
 *  não pelo chamador). */
export interface FlashcardRepository {
  findById(id: string): Promise<FlashcardEntity | null>;
  listByDeckId(deckId: string): Promise<FlashcardEntity[]>;
  /** Lote — usado para montar baralhos/sessão de revisão sem 1 query por baralho. */
  listByDeckIds(deckIds: string[]): Promise<FlashcardEntity[]>;
  create(input: FlashcardCreateInput): Promise<FlashcardEntity>;
}
