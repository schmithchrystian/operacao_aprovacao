import { mockModules, mockLessons } from "./modules";
import { mockCourses } from "./courses";
import { mockLessonProgress } from "./lesson-progress";
import { mockUsers } from "./users";

/**
 * Mock da próxima aula recomendada por aluno (ADR-0011, CLAUDE.md §23).
 *
 * Fase 6 (cursos/aulas): agora derivado do catálogo real (`modules.ts`/`lessons.ts`) e do
 * progresso mock (`lesson-progress.ts`) em vez de literais soltos — elimina o risco de
 * divergência que causou a inconsistência da Fase 5 (o concurso selecionado de `user-4`
 * era "contest-bombeiro", sem curso correspondente no catálogo de 3 cursos, enquanto a
 * próxima aula apontava para `course-2`/GCM; ver `dashboard-contest.ts`). Cada entrada
 * agora aponta para a aula `in_progress` (ponto de retomada) do curso em que o aluno está
 * matriculado — sempre coerente com `contestId` do curso e com `mockSelectedContests`.
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

function buildNextLesson(userId: string): NextLessonEntity | null {
  const progress = mockLessonProgress.find(
    (record) => record.userId === userId && record.status === "in_progress",
  );
  if (!progress) return null;

  const lesson = mockLessons.find((item) => item.id === progress.lessonId);
  if (!lesson) return null;

  const lessonModule = mockModules.find((item) => item.id === lesson.moduleId);
  if (!lessonModule) return null;

  const course = mockCourses.find((item) => item.id === lessonModule.courseId);
  if (!course) return null;

  return {
    courseId: course.id,
    moduleTitle: lessonModule.title,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    progressPercent: Math.round(progress.watchedPercent * 100),
    href: `/cursos/${course.slug}/modulos/${lessonModule.slug}/aulas/${lesson.id}`,
  };
}

/** Chave: `userId` (ver `src/mocks/data/users.ts`). Ausência de entrada = sem recomendação. */
export const mockNextLessons: Record<string, NextLessonEntity> = mockUsers.reduce(
  (acc, user) => {
    const nextLesson = buildNextLesson(user.id);
    if (nextLesson) acc[user.id] = nextLesson;
    return acc;
  },
  {} as Record<string, NextLessonEntity>,
);
