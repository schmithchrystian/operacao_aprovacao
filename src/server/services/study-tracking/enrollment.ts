import { assertSubscriptionAccess } from "@/server/billing/entitlement";
import { ForbiddenError, NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";

/**
 * Exige matrícula ATIVA do usuário no curso antes de expor a aula ou creditar progresso/pontos
 * (achado de segurança Fase 7 — ALTO). Sem esta checagem, como a 1ª aula de um curso é sempre
 * `available` (Regra 1 de `computeCourseProgress`), um usuário NÃO matriculado conseguiria
 * assistir e farmar os 100 pontos de conclusão (CLAUDE.md §11/§15/§24 — autorização e anti-fraude
 * sempre no servidor).
 *
 * "Ativa" = existe uma matrícula cujo status não é `cancelled` (uma matrícula `completed`
 * continua dando acesso — revisão do conteúdo já concluído é legítima). `userId` vem sempre da
 * sessão autenticada (já validado por `assertOwnership` no chamador), nunca do corpo da requisição.
 */
export async function assertActiveEnrollment(userId: string, courseId: string, lessonId?: string): Promise<void> {
  const repos = getRepositories();
  const course = await repos.courses.findById(courseId);
  if (!course || course.status !== "PUBLISHED" || course.deletedAt !== null) {
    throw new NotFoundError("Curso não encontrado.");
  }
  if (lessonId) {
    const lesson = await repos.lessons.findById(lessonId);
    const courseModule = lesson ? await repos.modules.findById(lesson.moduleId) : null;
    if (!lesson || !courseModule || courseModule.courseId !== courseId ||
        lesson.status !== "PUBLISHED" || lesson.deletedAt !== null ||
        courseModule.status !== "PUBLISHED" || courseModule.deletedAt !== null) {
      throw new NotFoundError("Aula não encontrada.");
    }
  }
  await assertSubscriptionAccess(userId);
  const enrollment = await repos.enrollments.findByUserAndCourse(userId, courseId);
  if (!enrollment || enrollment.status === "cancelled") {
    throw new ForbiddenError("Você não está matriculado neste curso.");
  }
}
