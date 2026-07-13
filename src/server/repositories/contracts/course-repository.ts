/**
 * Entidade de domínio retornada pelos repositórios (≠ DTO de contrato — ver ADR-0003).
 * Modelagem completa (módulos, aulas, etc.) é responsabilidade do agente `database`
 * e dos agentes de domínio nas fases seguintes.
 */
export interface CourseEntity {
  id: string;
  slug: string;
  title: string;
  description: string;
}

/** Abstração de persistência para cursos (ADR-0002). Métodos mínimos de leitura. */
export interface CourseRepository {
  findById(id: string): Promise<CourseEntity | null>;
  findBySlug(slug: string): Promise<CourseEntity | null>;
  list(): Promise<CourseEntity[]>;
}
