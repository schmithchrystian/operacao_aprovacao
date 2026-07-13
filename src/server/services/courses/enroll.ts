import { assertOwnership, requireUser } from "@/server/authorization";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import type { EnrollmentResultDTO } from "@/contracts/courses";

/**
 * Matricula o usuário autenticado em um curso. IDEMPOTENTE: matricular no mesmo curso
 * duas vezes não cria um segundo registro — `EnrollmentRepository.create` reaproveita a
 * matrícula existente (docs/DATA-MODEL.md, `Enrollment` única por `(userId, courseId)`).
 *
 * Autorização (ADR-0006, CLAUDE.md §11): `requireUser` + `assertOwnership` — só é possível
 * matricular a si mesmo; `userId` nunca vem do corpo da requisição.
 */
export async function enroll(userId: string, courseId: string): Promise<EnrollmentResultDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const course = await repos.courses.findById(courseId);
  if (!course) {
    throw new NotFoundError("Curso não encontrado.");
  }

  const enrollment = await repos.enrollments.create({ userId, courseId });

  return {
    courseId: enrollment.courseId,
    status: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
  };
}
