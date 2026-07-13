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
}

/** Abstração de persistência para módulos (ADR-0002). Métodos mínimos de leitura. */
export interface ModuleRepository {
  findById(id: string): Promise<ModuleEntity | null>;
  /** Retorna os módulos do curso ordenados por `order` crescente (ordem cronológica). */
  listByCourseId(courseId: string): Promise<ModuleEntity[]>;
}
