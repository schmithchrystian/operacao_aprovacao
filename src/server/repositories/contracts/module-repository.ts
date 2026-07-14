import type { ContentStatus } from "./shared";

/**
 * Entidade de domínio de módulo (Curso → Módulo → Aula, CLAUDE.md §12; docs/DATA-MODEL.md).
 * `order` é único por curso (`@@unique([courseId, order])` no schema Prisma futuro) — a
 * ordem cronológica da trilha depende exclusivamente deste campo, nunca da posição no array.
 */
export interface ModuleEntity {
  id: string;
  courseId: string;
  /** Matéria predominante do módulo (um módulo cobre tipicamente uma matéria). */
  subjectId: string;
  order: number;
  slug: string;
  title: string;
  /** Fase 17 (admin) — descrição opcional exibida na tela de gestão de conteúdo. */
  description: string | null;
  /** Fase 17 (admin) — professor responsável pelo módulo (`Module.teacherId`), ou `null`. */
  teacherId: string | null;
  /** Fase 17 (admin) — status editorial. Trilha do aluno (`listByCourseId`) só devolve
   *  `PUBLISHED`. */
  status: ContentStatus;
  /** Fase 17 (admin) — soft-delete (`Module.deletedAt`). ISO 8601, ou `null` quando ativo. */
  deletedAt: string | null;
}

/** Entrada de criação administrativa (Fase 17). Quando `order` é omitido, o repositório
 *  acrescenta o módulo ao final da trilha do curso (`max(order) + 1`). */
export interface ModuleCreateInput {
  courseId: string;
  subjectId: string;
  slug: string;
  title: string;
  description?: string | null;
  teacherId?: string | null;
  order?: number;
  now: Date;
}

export interface ModuleUpdateInput {
  id: string;
  subjectId?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  teacherId?: string | null;
  status?: ContentStatus;
  now: Date;
}

/** Abstração de persistência para módulos (ADR-0002). */
export interface ModuleRepository {
  /** Busca "crua" (ignora `status`/`deletedAt`) — uso administrativo. */
  findById(id: string): Promise<ModuleEntity | null>;
  /** Retorna os módulos PUBLICADOS e ativos do curso, ordenados por `order` crescente — trilha
   *  visível ao aluno. */
  listByCourseId(courseId: string): Promise<ModuleEntity[]>;
  /** Fase 17 (admin) — TODOS os módulos do curso (qualquer `status`, incluindo soft-deleted),
   *  ordenados por `order` crescente. */
  listByCourseIdForAdmin(courseId: string): Promise<ModuleEntity[]>;
  create(input: ModuleCreateInput): Promise<ModuleEntity>;
  update(input: ModuleUpdateInput): Promise<ModuleEntity>;
  /** Soft-delete (`deletedAt`) — operação destrutiva; o service exige `confirm: true`. */
  softDelete(id: string, now: Date): Promise<ModuleEntity>;
  /**
   * Persiste a nova ordem dos módulos do curso (drag-and-drop admin) — `orderedModuleIds` é a
   * lista COMPLETA dos módulos do curso, na ordem final desejada (mesmo padrão de
   * `StudyPlanItemRepository.reorder`). IDEMPOTENTE.
   */
  reorder(courseId: string, orderedModuleIds: string[], now: Date): Promise<ModuleEntity[]>;
}
