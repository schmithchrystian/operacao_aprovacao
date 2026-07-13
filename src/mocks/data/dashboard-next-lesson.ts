/**
 * Mock da próxima aula recomendada por aluno (ADR-0011, CLAUDE.md §23).
 *
 * TODO(Fase 7 — cursos/aulas): ainda não existem repositórios de `Module`/`Lesson` (só
 * `CourseRepository`, ver `src/server/repositories/contracts/course-repository.ts`).
 * `courseId` referencia `src/mocks/data/courses.ts` — o `dashboard-service` busca o
 * título do curso via `CourseRepository` em vez de duplicá-lo aqui. `moduleTitle` e os
 * dados de aula continuam mock até o repositório de aulas existir.
 */

export interface NextLessonEntity {
  /** Referencia `CourseEntity.id` em `src/mocks/data/courses.ts`. */
  courseId: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  progressPercent: number;
  href: string;
}

/** Chave: `userId` (ver `src/mocks/data/users.ts`). Ausência de entrada = sem recomendação. */
export const mockNextLessons: Record<string, NextLessonEntity> = {
  "user-1": {
    courseId: "course-1",
    moduleTitle: "Direito Constitucional aplicado à segurança pública",
    lessonId: "lesson-12",
    lessonTitle: "Direitos e garantias fundamentais",
    progressPercent: 35,
    href: "/cursos/pm-soldado/modulos/direito-constitucional/aulas/lesson-12",
  },
  "user-2": {
    courseId: "course-2",
    moduleTitle: "Legislação da Guarda Civil Municipal",
    lessonId: "lesson-05",
    lessonTitle: "Estatuto Geral das Guardas Municipais",
    progressPercent: 60,
    href: "/cursos/gcm-agente/modulos/legislacao/aulas/lesson-05",
  },
  "user-3": {
    courseId: "course-1",
    moduleTitle: "Português para concursos",
    lessonId: "lesson-02",
    lessonTitle: "Interpretação de texto",
    progressPercent: 10,
    href: "/cursos/pm-soldado/modulos/portugues/aulas/lesson-02",
  },
  "user-4": {
    courseId: "course-2",
    moduleTitle: "Direito Administrativo",
    lessonId: "lesson-20",
    lessonTitle: "Poderes administrativos",
    progressPercent: 90,
    href: "/cursos/gcm-agente/modulos/direito-administrativo/aulas/lesson-20",
  },
};
