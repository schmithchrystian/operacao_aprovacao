"use server";

import { fail, ok, type ActionResult } from "@/contracts/common";
import {
  enrollInputSchema,
  getCourseDetailInputSchema,
  listCoursesInputSchema,
  type CourseDetailDTO,
  type CourseSummaryDTO,
  type EnrollmentResultDTO,
} from "@/contracts/courses";
import { requireUser } from "@/server/authorization";
import { isDomainError, ValidationError } from "@/server/errors";
import { parseInput } from "@/server/validation";
import { enroll, getCourseDetail, listCourses } from "@/server/services/courses";

/**
 * Server Actions finas (docs/ARCHITECTURE.md §6): resolvem o usuário autenticado a partir
 * da sessão real do Auth.js (nunca de um `userId`/`role` vindo do cliente), validam a
 * entrada com Zod e repassam para o serviço de domínio. Mesmo padrão de
 * `@/server/actions/dashboard.ts`/`@/server/actions/admin/list-users.ts`: erros de domínio
 * viram `ActionResult` na fronteira, nunca propagam crus para a UI.
 */

function toActionError(error: unknown): ActionResult<never> {
  if (isDomainError(error)) {
    const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
    return fail(error.code, error.message, fieldErrors);
  }
  return fail("INTERNAL_ERROR", "Não foi possível processar a solicitação.");
}

/** Lista o catálogo de cursos (opcionalmente filtrado por concurso) para o aluno autenticado. */
export async function listCoursesAction(
  rawInput?: unknown,
): Promise<ActionResult<CourseSummaryDTO[]>> {
  try {
    const input = parseInput(listCoursesInputSchema, rawInput ?? {});
    const session = await requireUser();
    const courses = await listCourses(session.userId, input);
    return ok(courses);
  } catch (error) {
    return toActionError(error);
  }
}

/** Detalhe de um curso (trilha módulos → aulas + retomada) para o aluno autenticado. */
export async function getCourseDetailAction(
  rawInput: unknown,
): Promise<ActionResult<CourseDetailDTO>> {
  try {
    const input = parseInput(getCourseDetailInputSchema, rawInput);
    const session = await requireUser();
    const detail = await getCourseDetail(session.userId, input.slug);
    return ok(detail);
  } catch (error) {
    return toActionError(error);
  }
}

/** Matricula o aluno autenticado em um curso. Idempotente — matricular 2x não duplica. */
export async function enrollAction(rawInput: unknown): Promise<ActionResult<EnrollmentResultDTO>> {
  try {
    const input = parseInput(enrollInputSchema, rawInput);
    const session = await requireUser();
    const result = await enroll(session.userId, input.courseId);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}
