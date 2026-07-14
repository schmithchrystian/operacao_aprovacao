import type { ContentStatus } from "./shared";

/** Nível de dificuldade do curso (entidade de domínio — ver `CourseDifficulty` em `@/contracts/courses`). */
export type CourseDifficulty = "iniciante" | "intermediario" | "avancado";

/**
 * Entidade de domínio retornada pelos repositórios (≠ DTO de contrato — ver ADR-0003).
 * Modelagem completa (módulos, aulas, etc.) é responsabilidade do agente `database`
 * e dos agentes de domínio nas fases seguintes.
 *
 * PENDÊNCIA pré-existente (Fase 6, mantida): `contestName`/`teacherName`/`workloadHours`/
 * `coverColor`/`difficulty` NÃO são colunas de `Course` no schema Prisma (docs/DATA-MODEL.md) —
 * são campos presentacionais já "achatados" para o catálogo do aluno. A Fase 17 (admin) não
 * corrige essa divergência (fora do escopo desta entrega); `create`/`update` abaixo preenchem
 * defaults razoáveis para eles quando o admin não os informa.
 */
export interface CourseEntity {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Concurso ao qual o curso se destina (hierarquia Contest → Course, docs/DATA-MODEL.md). */
  contestId: string;
  contestName: string;
  teacherName: string;
  /** Carga horária total, em horas. */
  workloadHours: number;
  /** Cor de destaque da capa (token hex). */
  coverColor: string;
  difficulty: CourseDifficulty;
  /** Fase 17 (admin) — status editorial, espelha `Course.status` (Prisma). Catálogo do aluno
   *  (`list`/`listByContestId`) só devolve `PUBLISHED`. */
  status: ContentStatus;
  /** Fase 17 (admin) — soft-delete (`Course.deletedAt`). ISO 8601, ou `null` quando ativo.
   *  Catálogo do aluno nunca devolve um curso com `deletedAt` preenchido. */
  deletedAt: string | null;
}

/** Entrada de criação administrativa (Fase 17). `now` nunca é lido de `Date.now()` internamente.
 *  `contestName` é resolvido pelo SERVICE (via `ContestRepository`/curso existente do mesmo
 *  concurso) antes de chamar `create` — o repositório de cursos não conhece `ContestRepository`
 *  (ADR-0002, cada repositório só conhece sua própria entidade). */
export interface CourseCreateInput {
  slug: string;
  title: string;
  description: string;
  contestId: string;
  contestName: string;
  teacherName?: string;
  workloadHours?: number;
  coverColor?: string;
  difficulty?: CourseDifficulty;
  now: Date;
}

/** Entrada de edição administrativa (Fase 17) — todos os campos opcionais exceto `id`/`now`.
 *  `contestName` deve acompanhar `contestId` quando este muda (resolvido pelo service — mesma
 *  observação de `CourseCreateInput`). */
export interface CourseUpdateInput {
  id: string;
  title?: string;
  description?: string;
  contestId?: string;
  contestName?: string;
  teacherName?: string;
  workloadHours?: number;
  coverColor?: string;
  difficulty?: CourseDifficulty;
  status?: ContentStatus;
  now: Date;
}

/** Abstração de persistência para cursos (ADR-0002). */
export interface CourseRepository {
  /** Busca "crua" (ignora `status`/`deletedAt`) — uso administrativo e por serviços que já
   *  possuem o `id` de uma fonte confiável (ex.: dashboard). Nunca usar para decidir se um
   *  curso deve aparecer no catálogo público. */
  findById(id: string): Promise<CourseEntity | null>;
  findBySlug(slug: string): Promise<CourseEntity | null>;
  /** Catálogo do aluno — só `status: "PUBLISHED"` e `deletedAt: null`. */
  list(): Promise<CourseEntity[]>;
  /** Lista cursos de um concurso específico (Fase 6) — mesmo filtro de `list()`. */
  listByContestId(contestId: string): Promise<CourseEntity[]>;
  /** Fase 17 (admin) — TODOS os cursos, qualquer `status`, incluindo soft-deleted. */
  listForAdmin(): Promise<CourseEntity[]>;
  create(input: CourseCreateInput): Promise<CourseEntity>;
  update(input: CourseUpdateInput): Promise<CourseEntity>;
  /** Soft-delete (`deletedAt`) — operação destrutiva; o service exige `confirm: true` do
   *  chamador antes de invocar isto (CLAUDE.md §24, Fase 17). */
  softDelete(id: string, now: Date): Promise<CourseEntity>;
}
