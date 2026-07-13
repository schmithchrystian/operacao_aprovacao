/**
 * Entidade de domínio de aula (Curso → Módulo → Aula, CLAUDE.md §12; docs/DATA-MODEL.md).
 * `order` é único por módulo. `requiresLessonId` modela o pré-requisito simples
 * (`Lesson.requiresLessonId` / auto-relação `LessonPrerequisite` no schema Prisma futuro):
 * quando presente, a aula só libera se a aula referenciada estiver concluída, além da
 * regra sequencial padrão (CLAUDE.md §12 — "regras de liberação").
 *
 * NUNCA inclui campo de vídeo/percentual assistido/tempo — isso é responsabilidade do
 * agente `study-tracking` sobre `LessonProgress` (ver `lesson-progress-repository.ts`).
 */
export interface LessonEntity {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  durationMinutes: number;
  /** Aula pré-requisito (id) ou `null` quando não há pré-requisito explícito. */
  requiresLessonId: string | null;
}

/** Abstração de persistência para aulas (ADR-0002). Métodos mínimos de leitura. */
export interface LessonRepository {
  findById(id: string): Promise<LessonEntity | null>;
  /** Retorna as aulas do módulo ordenadas por `order` crescente (ordem cronológica). */
  listByModuleId(moduleId: string): Promise<LessonEntity[]>;
}
