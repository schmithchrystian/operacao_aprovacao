/**
 * Entidade de domínio de assunto (`Topic`, docs/DATA-MODEL.md — 1:N a partir de `Subject`).
 * Leitura apenas nesta fase (Fase 10 — agente `simulations`); usado para o filtro "assunto" e
 * para exibir o assunto de uma questão (`AttemptQuestionDTO.topicName`/caderno de erros).
 */
export interface TopicEntity {
  id: string;
  subjectId: string;
  name: string;
}

/** Abstração de persistência para assuntos (ADR-0002). Métodos mínimos de leitura. */
export interface TopicRepository {
  findById(id: string): Promise<TopicEntity | null>;
  listBySubjectId(subjectId: string): Promise<TopicEntity[]>;
  list(): Promise<TopicEntity[]>;
}
