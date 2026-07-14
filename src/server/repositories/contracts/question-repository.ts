/**
 * Entidade de domínio de questão (`Question`, docs/DATA-MODEL.md). Fase 10 — agente
 * `simulations`; Fase 17 — agente `backend` (CRUD administrativo). Espelha
 * `Difficulty`/`ContentStatus` do Prisma (mantidos sincronizados).
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
  /** Fase 17 (admin) — soft-delete (`Question.deletedAt`). ISO 8601, ou `null` quando ativa. */
  deletedAt: string | null;
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

/**
 * Entrada de criação administrativa (Fase 17 — agente `backend`). Cuida SÓ da linha `Question`
 * — as alternativas (`QuestionOption`) são responsabilidade de `QuestionOptionRepository`
 * (`./question-option-repository.ts`); o service (`server/services/admin/question-service.ts`)
 * orquestra os dois repositórios na mesma operação (mesmo espírito de `Course`/`Module`/`Lesson`
 * não conhecerem uns aos outros diretamente).
 */
export interface QuestionCreateInput {
  statement: string;
  subjectId: string;
  topicId: string | null;
  board: string | null;
  difficulty: QuestionDifficulty;
  explanation: string | null;
  now: Date;
}

export interface QuestionUpdateInput {
  id: string;
  statement?: string;
  subjectId?: string;
  topicId?: string | null;
  board?: string | null;
  difficulty?: QuestionDifficulty;
  explanation?: string | null;
  status?: QuestionStatus;
  now: Date;
}

/** Abstração de persistência para questões (ADR-0002). */
export interface QuestionRepository {
  /** Busca "crua" (ignora `status`/`deletedAt`) — uso administrativo. */
  findById(id: string): Promise<QuestionEntity | null>;
  findByIds(ids: string[]): Promise<QuestionEntity[]>;
  /** Nunca devolve uma questão soft-deleted, mesmo que `filter.status` seja informado
   *  explicitamente — deletar é sempre mais forte que qualquer filtro de status. */
  list(filter?: QuestionFilter): Promise<QuestionEntity[]>;
  /** Fase 17 (admin) — TODAS as questões (qualquer `status`, incluindo soft-deleted). */
  listForAdmin(): Promise<QuestionEntity[]>;
  create(input: QuestionCreateInput): Promise<QuestionEntity>;
  update(input: QuestionUpdateInput): Promise<QuestionEntity>;
  /** Soft-delete — operação destrutiva; o service exige `confirm: true`. */
  softDelete(id: string, now: Date): Promise<QuestionEntity>;
}
