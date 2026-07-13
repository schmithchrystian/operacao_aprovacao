/** Status da matrícula (`Enrollment`, docs/DATA-MODEL.md — única por `(userId, courseId)`). */
export type EnrollmentStatus = "active" | "completed" | "cancelled";

export interface EnrollmentEntity {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  /** ISO 8601. */
  enrolledAt: string;
}

/**
 * Abstração de persistência para matrículas (ADR-0002).
 *
 * `create` deve ser idempotente na implementação (mesmo `(userId, courseId)` nunca gera
 * dois registros — docs/DATA-MODEL.md: "reinscrição reutiliza o mesmo registro"). A
 * decisão de reaproveitar um registro existente é do repositório, não do service, para
 * espelhar a constraint única `@@unique([userId, courseId])` do schema Prisma futuro.
 */
export interface EnrollmentRepository {
  findByUserAndCourse(userId: string, courseId: string): Promise<EnrollmentEntity | null>;
  listByUserId(userId: string): Promise<EnrollmentEntity[]>;
  create(input: { userId: string; courseId: string }): Promise<EnrollmentEntity>;
}
