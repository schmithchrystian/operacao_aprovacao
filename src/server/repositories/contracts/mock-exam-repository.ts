import type { QuestionStatus } from "./question-repository";

/**
 * Entidade de domínio de simulado (`MockExam`, docs/DATA-MODEL.md). Fase 10 — agente
 * `simulations`; Fase 17 — agente `backend` (CRUD administrativo de catálogo).
 *
 * `questionIds` é um campo de CONVENIÊNCIA de leitura (ordenado pela junção real
 * `MockExamQuestion.order`, docs/DATA-MODEL.md) — não existe como coluna no schema, mas o
 * repositório sempre o resolve a partir da junção para poupar o service de conhecer a tabela
 * intermediária (ADR-0002, "único ponto que conhece a origem dos dados").
 */
export interface MockExamEntity {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  status: QuestionStatus;
  /** IDs das questões, na ordem definida por `MockExamQuestion.order`. */
  questionIds: string[];
  /**
   * Autor do simulado. Para simulados de CATÁLOGO é o admin (ou `null` no mock); para
   * simulados PESSOAIS ad-hoc é o próprio aluno que os montou (nunca descartado — usado para
   * rastreabilidade e como reforço de propriedade).
   */
  createdById: string | null;
  /**
   * `true` = simulado PESSOAL montado sob demanda por um aluno a partir de filtros; nunca deve
   * aparecer no catálogo compartilhado nem ser iniciado por outro usuário (achado de segurança
   * Fase 10 — MÉDIO). `false` = simulado de CATÁLOGO (compartilhado, publicado). Discriminador
   * primário de `list()` e da guarda de "iniciar por `mockExamId`" (ver
   * `src/server/services/simulations/question-pool.ts`).
   */
  isPersonal: boolean;
  createdAt: string;
  /** Fase 17 (admin) — soft-delete (`MockExam.deletedAt`). ISO 8601, ou `null` quando ativo. */
  deletedAt: string | null;
}

/**
 * Entrada de criação. Neste projeto `create()` é chamado EXCLUSIVAMENTE para montar simulados
 * PESSOAIS ad-hoc a partir de filtros (matéria/assunto/banca/dificuldade) — `MockExamAttempt.
 * mockExamId` é obrigatório no schema (não nulo), então mesmo uma seleção ad-hoc de questões
 * precisa de um `MockExam` (+ `MockExamQuestion`) próprio antes de existir uma tentativa (ver
 * `src/server/services/simulations/question-pool.ts`). Simulados de catálogo vêm do seed/mock
 * OU (Fase 17) de `createCatalog()` — nunca de `create()`, que sempre marca o resultado como
 * pessoal (`isPersonal: true`, `status: DRAFT`).
 */
export interface MockExamCreateInput {
  title: string;
  description: string | null;
  durationMinutes: number;
  /** Cria as linhas de `MockExamQuestion` correspondentes, na ordem informada. */
  questionIds: string[];
  /** Autor/dono do simulado pessoal — o aluno que o montou (nunca descartado). */
  createdById: string | null;
  now: Date;
}

/** Entrada de criação ADMINISTRATIVA de catálogo (Fase 17) — sempre `isPersonal: false`,
 *  nunca aparece como resultado de `create()` (ver nota acima). */
export interface MockExamCatalogCreateInput {
  title: string;
  description: string | null;
  durationMinutes: number;
  questionIds: string[];
  /** Admin autor do simulado de catálogo. */
  createdById: string | null;
  now: Date;
}

export interface MockExamUpdateInput {
  id: string;
  title?: string;
  description?: string | null;
  durationMinutes?: number;
  questionIds?: string[];
  status?: QuestionStatus;
  now: Date;
}

/** Abstração de persistência para simulados (ADR-0002). */
export interface MockExamRepository {
  /** Busca "crua" (ignora `status`/`deletedAt`) — uso administrativo e de resolução de
   *  tentativa (o service de simulados já valida propriedade/status separadamente). */
  findById(id: string): Promise<MockExamEntity | null>;
  /**
   * Catálogo de simulados COMPARTILHADOS (publicados, ativos e NÃO pessoais). Nunca devolve
   * simulados pessoais ad-hoc de nenhum aluno nem soft-deleted (achado de segurança Fase 10 —
   * MÉDIO).
   */
  list(): Promise<MockExamEntity[]>;
  /** Fase 17 (admin) — TODOS os simulados de CATÁLOGO (qualquer `status`, incluindo
   *  soft-deleted); nunca inclui simulados pessoais ad-hoc de alunos. */
  listForAdmin(): Promise<MockExamEntity[]>;
  /** Cria um simulado PESSOAL ad-hoc (isPersonal=true, DRAFT). Ver `MockExamCreateInput`. */
  create(input: MockExamCreateInput): Promise<MockExamEntity>;
  /** Fase 17 (admin) — cria um simulado de CATÁLOGO (isPersonal=false, DRAFT). */
  createCatalog(input: MockExamCatalogCreateInput): Promise<MockExamEntity>;
  /** Fase 17 (admin) — edita um simulado de CATÁLOGO existente. */
  update(input: MockExamUpdateInput): Promise<MockExamEntity>;
  /** Soft-delete — operação destrutiva; o service exige `confirm: true`. */
  softDelete(id: string, now: Date): Promise<MockExamEntity>;
}
