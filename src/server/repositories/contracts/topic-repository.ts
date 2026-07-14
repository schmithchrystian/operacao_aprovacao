/**
 * Entidade de domínio de assunto (`Topic`, docs/DATA-MODEL.md — 1:N a partir de `Subject`).
 * Usado para o filtro "assunto" e para exibir o assunto de uma questão (`AttemptQuestionDTO.
 * topicName`/caderno de erros).
 */
export interface TopicEntity {
  id: string;
  subjectId: string;
  name: string;
  /** Fase 17 (admin) — soft-delete (`Topic.deletedAt`). ISO 8601, ou `null` quando ativo. */
  deletedAt: string | null;
}

/** Entrada de criação administrativa (Fase 17 — "Assuntos: cadastrar"). Mesma pendência de
 *  `slug` documentada em `subject-repository.ts` (`SubjectCreateInput`). */
export interface TopicCreateInput {
  subjectId: string;
  name: string;
  now: Date;
}

export interface TopicUpdateInput {
  id: string;
  subjectId?: string;
  name?: string;
  now: Date;
}

/** Abstração de persistência para assuntos (ADR-0002). */
export interface TopicRepository {
  findById(id: string): Promise<TopicEntity | null>;
  /** Só assuntos ativos (`deletedAt: null`). */
  listBySubjectId(subjectId: string): Promise<TopicEntity[]>;
  /** Só assuntos ativos (`deletedAt: null`). */
  list(): Promise<TopicEntity[]>;
  /** Fase 17 (admin) — TODOS os assuntos, incluindo soft-deleted. */
  listForAdmin(): Promise<TopicEntity[]>;
  create(input: TopicCreateInput): Promise<TopicEntity>;
  update(input: TopicUpdateInput): Promise<TopicEntity>;
  /** Soft-delete — operação destrutiva; o service exige `confirm: true`. */
  softDelete(id: string, now: Date): Promise<TopicEntity>;
}
