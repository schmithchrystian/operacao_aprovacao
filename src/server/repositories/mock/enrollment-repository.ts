import { mockEnrollments } from "@/mocks";
import type { EnrollmentEntity, EnrollmentRepository } from "../contracts/enrollment-repository";
import { mockStore } from "./mock-store";

/**
 * Implementação mock — lê de `src/mocks/data/enrollments.ts` (ADR-0011).
 *
 * Mantém um estado mutável em memória de processo (cópia do seed) para suportar `enroll()`
 * de forma idempotente nesta fase (matricular 2x não duplica) sem exigir banco — a
 * persistência real caberá ao `PrismaEnrollmentRepository`. Não sobrevive a reinícios do
 * processo nem é compartilhada entre processos (limitação aceitável para mocks).
 *
 * Estado via `mockStore` (`./mock-store.ts`), não mais campos `static` da classe: campos
 * `static` também são reinicializados por instância de módulo no Next.js 16 (Turbopack dev e
 * runtime serverless) — sofriam o MESMO isolamento entre Route Handlers/Server Actions/Server
 * Components que os demais mocks deste projeto.
 */
const store = mockStore<EnrollmentEntity[]>("enrollment", () => [...mockEnrollments]);
const sequence = mockStore<{ value: number }>("enrollment:sequence", () => ({ value: store.length }));

export class MockEnrollmentRepository implements EnrollmentRepository {
  async findByUserAndCourse(userId: string, courseId: string): Promise<EnrollmentEntity | null> {
    return store.find((enrollment) => enrollment.userId === userId && enrollment.courseId === courseId) ?? null;
  }

  async listByUserId(userId: string): Promise<EnrollmentEntity[]> {
    return store.filter((enrollment) => enrollment.userId === userId);
  }

  async create(input: { userId: string; courseId: string }): Promise<EnrollmentEntity> {
    const existing = await this.findByUserAndCourse(input.userId, input.courseId);
    if (existing) {
      return existing;
    }

    sequence.value += 1;
    const enrollment: EnrollmentEntity = {
      id: `enr-mock-${sequence.value}`,
      userId: input.userId,
      courseId: input.courseId,
      status: "active",
      enrolledAt: new Date().toISOString(),
    };
    store.push(enrollment);
    return enrollment;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockEnrollmentStore(): void {
  store.splice(0, store.length, ...mockEnrollments);
  sequence.value = store.length;
}
