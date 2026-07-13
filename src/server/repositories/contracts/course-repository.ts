/** Nível de dificuldade do curso (entidade de domínio — ver `CourseDifficulty` em `@/contracts/courses`). */
export type CourseDifficulty = "iniciante" | "intermediario" | "avancado";

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
  /** Concurso ao qual o curso se destina (hierarquia Contest → Course, docs/DATA-MODEL.md). */
  contestId: string;
  contestName: string;
  teacherName: string;
  /** Carga horária total, em horas. */
  workloadHours: number;
  /** Cor de destaque da capa (token hex). */
  coverColor: string;
  difficulty: CourseDifficulty;
}

/** Abstração de persistência para cursos (ADR-0002). Métodos mínimos de leitura. */
export interface CourseRepository {
  findById(id: string): Promise<CourseEntity | null>;
  findBySlug(slug: string): Promise<CourseEntity | null>;
  list(): Promise<CourseEntity[]>;
  /** Lista cursos de um concurso específico (Fase 6 — catálogo filtrado por concurso). */
  listByContestId(contestId: string): Promise<CourseEntity[]>;
}
