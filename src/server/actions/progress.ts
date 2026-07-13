"use server";

import { fail, ok, type ActionResult } from "@/contracts/common";
import { getLessonViewInputSchema, type LessonViewDTO } from "@/contracts/progress";
import { requireUser } from "@/server/authorization";
import { isDomainError, ValidationError } from "@/server/errors";
import { parseInput } from "@/server/validation";
import { getLessonView } from "@/server/services/study-tracking";

/**
 * Server Action fina (docs/ARCHITECTURE.md §6): resolve o usuário autenticado a partir da
 * sessão real do Auth.js (nunca de um `userId` vindo do cliente), valida a entrada com Zod e
 * repassa para o serviço de domínio. Mesmo padrão de `@/server/actions/courses.ts`.
 */
function toActionError(error: unknown): ActionResult<never> {
  if (isDomainError(error)) {
    const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
    return fail(error.code, error.message, fieldErrors);
  }
  return fail("INTERNAL_ERROR", "Não foi possível processar a solicitação.");
}

/** Dados da página de aula (player, materiais, navegação, progresso) para o aluno autenticado. */
export async function getLessonViewAction(rawInput: unknown): Promise<ActionResult<LessonViewDTO>> {
  try {
    const input = parseInput(getLessonViewInputSchema, rawInput);
    const session = await requireUser();
    const view = await getLessonView(session.userId, input.courseSlug, input.moduleSlug, input.lessonId);
    return ok(view);
  } catch (error) {
    return toActionError(error);
  }
}
