import { assertOwnership, requireUser } from "@/server/authorization";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { buildLessonHref } from "@/lib/routes";
import type { ResumePointDTO } from "@/contracts/courses";
import { computeProgressForCourse } from "./shared";

/**
 * Retorna a aula de retomada (primeira aula não concluída e já liberada) de um curso para
 * o usuário autenticado. `null` quando o curso está 100% concluído (nada a retomar).
 *
 * Autorização (ADR-0006, CLAUDE.md §11): `requireUser` + `assertOwnership` — só é possível
 * consultar o próprio progresso; `userId` nunca vem do corpo da requisição.
 */
export async function getResumePoint(
  userId: string,
  courseId: string,
): Promise<ResumePointDTO | null> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const course = await repos.courses.findById(courseId);
  if (!course) {
    throw new NotFoundError("Curso não encontrado.");
  }

  const computed = await computeProgressForCourse(userId, courseId);
  if (!computed.resumeLesson) {
    return null;
  }

  const resumeModule = computed.modules.find(
    (item) => item.module.id === computed.resumeLesson?.moduleId,
  );
  if (!resumeModule) {
    return null;
  }

  return {
    courseId: course.id,
    moduleId: computed.resumeLesson.moduleId,
    lessonId: computed.resumeLesson.lesson.id,
    lessonTitle: computed.resumeLesson.lesson.title,
    href: buildLessonHref({
      courseSlug: course.slug,
      moduleSlug: resumeModule.module.slug,
      lessonId: computed.resumeLesson.lesson.id,
    }),
  };
}
