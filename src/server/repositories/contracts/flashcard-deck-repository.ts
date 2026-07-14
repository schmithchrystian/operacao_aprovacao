/**
 * Entidade de domínio de baralho de flashcards (`FlashcardDeck`, docs/DATA-MODEL.md). Fase 14 —
 * agente `backend`. `userId` nullable = baralho do sistema/público (ex.: um baralho por
 * matéria); preenchido = baralho pessoal do aluno.
 */
export type FlashcardDeckKind = "SUBJECT" | "PERSONAL" | "ERRORS" | "NOTES";

export interface FlashcardDeckEntity {
  id: string;
  /** `null` = baralho do sistema (público, `kind: "SUBJECT"`). */
  userId: string | null;
  subjectId: string | null;
  title: string;
  isPublic: boolean;
  /**
   * CAMPO DE APLICAÇÃO — `FlashcardDeck` no schema Prisma ainda não tem uma coluna própria para
   * distinguir "personalizado" de "criado do caderno de erros"/"criado de anotações" (todos são
   * baralhos com `userId` preenchido); mesma divergência documentada em
   * `StudyPlanItemEntity.kind` (`@/server/repositories/contracts/study-plan-item-repository`) e
   * `BrainstormCardEntity.type` — pendência para o agente `database` avaliar numa migration
   * futura (ver `docs/FLASHCARDS.md`).
   */
  kind: FlashcardDeckKind;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardDeckCreateInput {
  userId: string | null;
  subjectId: string | null;
  title: string;
  isPublic: boolean;
  kind: FlashcardDeckKind;
  now: Date;
}

/** Abstração de persistência para baralhos de flashcards (ADR-0002). */
export interface FlashcardDeckRepository {
  findById(id: string): Promise<FlashcardDeckEntity | null>;
  /** Baralhos do sistema (`kind: "SUBJECT"`, `userId: null`) — um por matéria, visíveis a todos. */
  listSystemDecks(): Promise<FlashcardDeckEntity[]>;
  /** Todos os baralhos PESSOAIS (qualquer `kind` com `userId` preenchido) do usuário. */
  listByUserId(userId: string): Promise<FlashcardDeckEntity[]>;
  /** Localiza o baralho pessoal de um `kind` específico (ex.: o baralho "Criados de erros" do
   *  usuário) — usado por `createFromErrors`/`createFromNotes` para um get-or-create idempotente
   *  (no máximo um baralho por `(userId, kind)` para `kind !== "PERSONAL"`). */
  findByUserIdAndKind(userId: string, kind: FlashcardDeckKind): Promise<FlashcardDeckEntity | null>;
  create(input: FlashcardDeckCreateInput): Promise<FlashcardDeckEntity>;
}
