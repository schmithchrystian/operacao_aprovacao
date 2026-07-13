import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import type { CourseSummaryDTO } from "@/contracts/courses";
import { buildCourseSummary } from "./shared";

export interface ListCoursesFilter {
  contestId?: string;
}

/**
 * Lista os cursos do catálogo (opcionalmente filtrados por concurso) com progresso/
 * matrícula do usuário autenticado já anexados.
 *
 * Autorização (ADR-0006, CLAUDE.md §11): `requireUser` garante sessão real; `assertOwnership`
 * impede que `userId` (usado para calcular progresso/matrícula) seja de outra pessoa —
 * nunca aceitar `userId` vindo do cliente, sempre da sessão.
 */
export async function listCourses(
  userId: string,
  filter: ListCoursesFilter = {},
): Promise<CourseSummaryDTO[]> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const courses = filter.contestId
    ? await repos.courses.listByContestId(filter.contestId)
    : await repos.courses.list();

  return Promise.all(courses.map((course) => buildCourseSummary(userId, course)));
}
