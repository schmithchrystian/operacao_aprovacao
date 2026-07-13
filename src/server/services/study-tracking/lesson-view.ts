import { buildLessonHref } from "@/lib/routes";
import type { LessonViewDTO } from "@/contracts/progress";
import { assertOwnership, requireUser } from "@/server/authorization";
import { ForbiddenError, NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { computeProgressForCourse } from "@/server/services/courses/shared";
import { assertActiveEnrollment } from "./enrollment";

/**
 * Dados completos da página de aula (player, materiais, navegação, progresso) para o
 * usuário autenticado. Autorização (ADR-0006, CLAUDE.md §11): `requireUser` + `assertOwnership`
 * — o progresso exibido é sempre o do próprio usuário; `userId` nunca vem do cliente.
 *
 * Anti-IDOR de path: `lessonId` precisa pertencer ao `moduleSlug`/`courseSlug` informados na
 * URL — caso contrário (aula de outro módulo/curso), trata como 404 em vez de vazar dados de
 * outro contexto.
 */
export async function getLessonView(
  userId: string,
  courseSlug: string,
  moduleSlug: string,
  lessonId: string,
): Promise<LessonViewDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();

  const course = await repos.courses.findBySlug(courseSlug);
  if (!course) {
    throw new NotFoundError("Curso não encontrado.");
  }

  // Matrícula ativa obrigatória antes de expor QUALQUER dado da aula (achado de segurança
  // Fase 7 — ALTO). Ver `./enrollment.ts`.
  await assertActiveEnrollment(userId, course.id);

  const modules = await repos.modules.listByCourseId(course.id);
  const courseModule = modules.find((candidate) => candidate.slug === moduleSlug);
  if (!courseModule) {
    throw new NotFoundError("Módulo não encontrado.");
  }

  const lesson = await repos.lessons.findById(lessonId);
  if (!lesson || lesson.moduleId !== courseModule.id) {
    throw new NotFoundError("Aula não encontrada.");
  }

  const computed = await computeProgressForCourse(userId, course.id);

  // Achata módulos→aulas na ordem cronológica para localizar as aulas vizinhas.
  const flatLessons = computed.modules.flatMap((computedModule) =>
    computedModule.lessons.map((entry) => ({
      moduleSlug: computedModule.module.slug,
      lesson: entry.lesson,
      status: entry.status,
    })),
  );
  const currentIndex = flatLessons.findIndex((entry) => entry.lesson.id === lessonId);
  const currentEntry = flatLessons[currentIndex];
  if (!currentEntry) {
    throw new NotFoundError("Aula não encontrada.");
  }

  if (currentEntry.status === "locked") {
    throw new ForbiddenError("Esta aula ainda está bloqueada.");
  }

  const currentModule = computed.modules.find((candidate) => candidate.module.id === courseModule.id);
  const previousEntry = currentIndex > 0 ? flatLessons[currentIndex - 1] : undefined;
  const nextEntry = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : undefined;

  const sessions = await repos.studySessions.listSessionsByUserAndLesson(userId, lessonId);
  const resumePositionSeconds = sessions.reduce((max, s) => Math.max(max, s.lastPositionSeconds), 0);

  const progress = await repos.lessonProgress.findByUserAndLesson(userId, lessonId);

  return {
    lessonId: lesson.id,
    title: lesson.title,
    order: lesson.order,
    durationMinutes: lesson.durationMinutes,
    teacherName: course.teacherName,
    // TODO(agente `database`): `Lesson` ainda não expõe um campo de descrição próprio nesta
    // fase — usa-se um texto derivado até o repositório/schema disponibilizar o campo real.
    description: `Aula "${lesson.title}" do módulo "${courseModule.title}".`,
    // TODO(agente `database`): não existe repositório de `LessonMaterial` ainda (Fase 6 não o
    // criou) — lista vazia até essa peça existir, em vez de inventar dados mock aqui.
    materials: [],
    // Placeholder — hospedagem real de vídeo é pendência conhecida (docs/ARCHITECTURE.md §11).
    videoUrl: `https://cdn.opapp.mock/videos/${lesson.id}.mp4`,
    status: currentEntry.status,
    locked: false,
    resumePositionSeconds,
    watchedPercent: Math.round((progress?.watchedPercent ?? 0) * 10_000) / 100,
    moduleProgressPercent: currentModule?.progressPercent ?? 0,
    courseProgressPercent: computed.courseProgressPercent,
    previousLesson: previousEntry
      ? {
          lessonId: previousEntry.lesson.id,
          title: previousEntry.lesson.title,
          href: buildLessonHref({
            courseSlug: course.slug,
            moduleSlug: previousEntry.moduleSlug,
            lessonId: previousEntry.lesson.id,
          }),
        }
      : null,
    nextLesson: nextEntry
      ? {
          lessonId: nextEntry.lesson.id,
          title: nextEntry.lesson.title,
          href: buildLessonHref({
            courseSlug: course.slug,
            moduleSlug: nextEntry.moduleSlug,
            lessonId: nextEntry.lesson.id,
          }),
        }
      : null,
  };
}
