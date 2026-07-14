/**
 * Entidade de domínio de alternativa (`QuestionOption`, docs/DATA-MODEL.md). Fase 10 — agente
 * `simulations`; Fase 17 — agente `backend` (CRUD administrativo).
 *
 * REGRA DURA (CLAUDE.md §18/§25, docs/DATA-MODEL.md §5): `isCorrect` existe aqui porque a
 * correção precisa dele no servidor, mas NUNCA deve ser projetado para um DTO consumido pelo
 * cliente antes da correção (`AttemptQuestionDTO` — ver `@/contracts/simulations` — omite este
 * campo por completo). Só `QuestionResultDTO` (pós-correção, tentativa já `FINISHED`) o expõe.
 * O admin (Fase 17), ao editar uma questão, também manipula `isCorrect` diretamente — é o único
 * papel autorizado a vê-lo/defini-lo fora da correção.
 */
export interface QuestionOptionEntity {
  id: string;
  questionId: string;
  label: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

/** Rascunho de alternativa usado na criação/edição administrativa (Fase 17) — sem `id`/
 *  `questionId` (atribuídos pelo repositório) nem `order` (= posição no array, 1-based). */
export interface QuestionOptionDraft {
  label: string;
  text: string;
  isCorrect: boolean;
}

/** Abstração de persistência para alternativas (ADR-0002). */
export interface QuestionOptionRepository {
  findById(id: string): Promise<QuestionOptionEntity | null>;
  /** Ordenadas por `order` crescente. */
  listByQuestionId(questionId: string): Promise<QuestionOptionEntity[]>;
  /** Lote — usado para montar várias questões de uma tentativa de uma vez. Ordenadas por
   *  `questionId` (agrupadas) e, dentro de cada grupo, por `order` crescente. */
  listByQuestionIds(questionIds: string[]): Promise<QuestionOptionEntity[]>;
  /**
   * Fase 17 (admin) — substitui TODAS as alternativas da questão pelas informadas (ordem do
   * array = `order`, 1-based). Usado tanto na criação (questão nova, sem alternativas prévias)
   * quanto na edição (substitui o conjunto anterior por completo — nunca um PATCH parcial de
   * alternativa individual, para não deixar `isCorrect` inconsistente entre chamadas).
   */
  replaceForQuestion(questionId: string, drafts: QuestionOptionDraft[]): Promise<QuestionOptionEntity[]>;
}
