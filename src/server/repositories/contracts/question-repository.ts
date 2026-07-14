/**
 * Entidade de domínio de questão (`Question`, docs/DATA-MODEL.md). Fase 10 — agente
 * `simulations`. Espelha `Difficulty`/`ContentStatus` do Prisma (mantidos sincronizados).
 *
 * NUNCA inclui a resposta correta — isso vive só em `QuestionOptionEntity.isCorrect`
 * (`./question-option-repository.ts`), lido apenas pelo backend na correção
 * (CLAUDE.md §18/§25, docs/DATA-MODEL.md §5 "Resposta correta protegida").
 */
export type QuestionDifficulty = "EASY" | "MEDIUM" | "HARD";
export type QuestionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface QuestionEntity {
  id: string;
  statement: string;
  subjectId: string;
  topicId: string | null;
  board: string | null;
  difficulty: QuestionDifficulty;
  /** Liberada para o cliente só APÓS a correção (`AttemptResultDTO`/caderno de erros). */
  explanation: string | null;
  status: QuestionStatus;
  createdAt: string;
}

/**
 * Filtro de seleção de questões (Fase 10 — filtros de simulado: matéria, assunto, banca,
 * dificuldade). `subjectIds` é usado quando o filtro de origem é concurso/curso (resolvido
 * pelo service via `Course`/`Module` — `Question` não tem FK direta para concurso/curso,
 * docs/DATA-MODEL.md); quando informado junto de `subjectId`, o service já resolveu a
 * interseção — o repositório só aplica os campos presentes (AND).
 */
export interface QuestionFilter {
  subjectId?: string;
  subjectIds?: string[];
  topicId?: string;
  board?: string;
  difficulty?: QuestionDifficulty;
  /** Só questões publicadas por padrão — repositório deve aplicar mesmo quando omitido. */
  status?: QuestionStatus;
}

/** Abstração de persistência para questões (ADR-0002). Métodos mínimos de leitura. */
export interface QuestionRepository {
  findById(id: string): Promise<QuestionEntity | null>;
  findByIds(ids: string[]): Promise<QuestionEntity[]>;
  list(filter?: QuestionFilter): Promise<QuestionEntity[]>;
}
