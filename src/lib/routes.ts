/**
 * Fonte única das convenções de rota compartilhadas entre backend e frontend.
 *
 * Manter a montagem de URLs aqui evita divergência entre a rota gerada nos serviços
 * (`getCourseDetail`/`getResumePoint`) e a usada pelos componentes de UI — ambos devem
 * importar este helper em vez de reconstruir a string à mão.
 */

export interface LessonHrefParams {
  courseSlug: string;
  moduleSlug: string;
  lessonId: string;
}

/** Rota da página de uma aula dentro de um módulo/curso. */
export function buildLessonHref({ courseSlug, moduleSlug, lessonId }: LessonHrefParams): string {
  return `/cursos/${courseSlug}/modulos/${moduleSlug}/aulas/${lessonId}`;
}
