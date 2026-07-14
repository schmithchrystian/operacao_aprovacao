/**
 * Entidade de domínio de alternativa (`QuestionOption`, docs/DATA-MODEL.md). Fase 10 — agente
 * `simulations`.
 *
 * REGRA DURA (CLAUDE.md §18/§25, docs/DATA-MODEL.md §5): `isCorrect` existe aqui porque a
 * correção precisa dele no servidor, mas NUNCA deve ser projetado para um DTO consumido pelo
 * cliente antes da correção (`AttemptQuestionDTO` — ver `@/contracts/simulations` — omite este
 * campo por completo). Só `QuestionResultDTO` (pós-correção, tentativa já `FINISHED`) expõe
 * `isCorrect`.
 */
export interface QuestionOptionEntity {
  id: string;
  questionId: string;
  label: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

/** Abstração de persistência para alternativas (ADR-0002). Métodos mínimos de leitura. */
export interface QuestionOptionRepository {
  findById(id: string): Promise<QuestionOptionEntity | null>;
  /** Ordenadas por `order` crescente. */
  listByQuestionId(questionId: string): Promise<QuestionOptionEntity[]>;
  /** Lote — usado para montar várias questões de uma tentativa de uma vez. Ordenadas por
   *  `questionId` (agrupadas) e, dentro de cada grupo, por `order` crescente. */
  listByQuestionIds(questionIds: string[]): Promise<QuestionOptionEntity[]>;
}
