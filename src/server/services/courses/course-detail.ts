import { assertOwnership, requireUser } from "@/server/authorization";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { buildLessonHref } from "@/lib/routes";
import type { CourseDetailDTO, ModuleDTO } from "@/contracts/courses";
import { buildCourseSummary, computeProgressForCourse } from "./shared";

/**
 * Curso completo (trilha módulos → aulas com status de liberação já computado) + ponto de
 * retomada, para a página do curso.
 *
 * Autorização (ADR-0006, CLAUDE.md §11): `requireUser` + `assertOwnership` — o progresso
 * exibido é sempre o do próprio usuário autenticado (anti-IDOR); `userId` nunca vem do
 * corpo da requisição.
 */
export async function getCourseDetail(userId: string, slug: string): Promise<CourseDetailDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const course = await repos.courses.findBySlug(slug);
  if (!course) {
    throw new NotFoundError("Curso não encontrado.");
  }

  const [summary, computed] = await Promise.all([
    buildCourseSummary(userId, course),
    computeProgressForCourse(userId, course.id),
  ]);

  const modules: ModuleDTO[] = computed.modules.map(
    ({ module: courseModule, lessons, status, progressPercent }) => ({
      id: courseModule.id,
      slug: courseModule.slug,
      order: courseModule.order,
      title: courseModule.title,
      progressPercent,
      status,
      lessons: lessons.map(({ lesson, status: lessonStatus }) => ({
        id: lesson.id,
        order: lesson.order,
        title: lesson.title,
        durationMinutes: lesson.durationMinutes,
        status: lessonStatus,
      })),
    }),
  );

  const resumeModule = computed.resumeLesson
    ? computed.modules.find((item) => item.module.id === computed.resumeLesson?.moduleId)
    : undefined;

  const nextLesson =
    computed.resumeLesson && resumeModule
      ? {
          moduleId: computed.resumeLesson.moduleId,
          lessonId: computed.resumeLesson.lesson.id,
          lessonTitle: computed.resumeLesson.lesson.title,
          href: buildLessonHref({
            courseSlug: course.slug,
            moduleSlug: resumeModule.module.slug,
            lessonId: computed.resumeLesson.lesson.id,
          }),
        }
      : null;

  return { course: summary, modules, nextLesson };
}
