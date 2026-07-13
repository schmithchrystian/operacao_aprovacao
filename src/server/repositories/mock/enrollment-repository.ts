import { mockEnrollments } from "@/mocks";
import type { EnrollmentEntity, EnrollmentRepository } from "../contracts/enrollment-repository";

/**
 * Implementação mock — lê de `src/mocks/data/enrollments.ts` (ADR-0011).
 *
 * Mantém um estado mutável em memória de processo (cópia do seed) para suportar `enroll()`
 * de forma idempotente nesta fase (matricular 2x não duplica) sem exigir banco — a
 * persistência real caberá ao `PrismaEnrollmentRepository`. Não sobrevive a reinícios do
 * processo nem é compartilhada entre processos (limitação aceitável para mocks).
 */
export class MockEnrollmentRepository implements EnrollmentRepository {
  private static store: EnrollmentEntity[] = [...mockEnrollments];
  private static sequence = MockEnrollmentRepository.store.length;

  async findByUserAndCourse(userId: string, courseId: string): Promise<EnrollmentEntity | null> {
    return (
      MockEnrollmentRepository.store.find(
        (enrollment) => enrollment.userId === userId && enrollment.courseId === courseId,
      ) ?? null
    );
  }

  async listByUserId(userId: string): Promise<EnrollmentEntity[]> {
    return MockEnrollmentRepository.store.filter((enrollment) => enrollment.userId === userId);
  }

  async create(input: { userId: string; courseId: string }): Promise<EnrollmentEntity> {
    const existing = await this.findByUserAndCourse(input.userId, input.courseId);
    if (existing) {
      return existing;
    }

    MockEnrollmentRepository.sequence += 1;
    const enrollment: EnrollmentEntity = {
      id: `enr-mock-${MockEnrollmentRepository.sequence}`,
      userId: input.userId,
      courseId: input.courseId,
      status: "active",
      enrolledAt: new Date().toISOString(),
    };
    MockEnrollmentRepository.store.push(enrollment);
    return enrollment;
  }
}
