import { mockLessonProgress } from "@/mocks";
import type {
  LessonProgressEntity,
  LessonProgressRepository,
  LessonProgressUpsertInput,
} from "../contracts/lesson-progress-repository";

/**
 * Implementação mock — seed inicial de `src/mocks/data/lesson-progress.ts` (ADR-0011).
 *
 * Mantém uma cópia mutável em memória de processo (mesmo padrão de
 * `MockEnrollmentRepository`) para suportar `upsert()` — escrita exclusiva do agente
 * `study-tracking` (Fase 7) a partir do tempo/posição reconstruídos no servidor. Não sobrevive
 * a reinícios do processo nem é compartilhada entre processos (limitação aceitável para mocks;
 * a persistência real caberá ao `PrismaLessonProgressRepository`).
 */
let store: LessonProgressEntity[] = [...mockLessonProgress];

export class MockLessonProgressRepository implements LessonProgressRepository {
  async findByUserAndLesson(userId: string, lessonId: string): Promise<LessonProgressEntity | null> {
    return store.find((progress) => progress.userId === userId && progress.lessonId === lessonId) ?? null;
  }

  async listByUserId(userId: string): Promise<LessonProgressEntity[]> {
    return store.filter((progress) => progress.userId === userId);
  }

  async upsert(input: LessonProgressUpsertInput): Promise<LessonProgressEntity> {
    const now = new Date().toISOString();
    const index = store.findIndex(
      (progress) => progress.userId === input.userId && progress.lessonId === input.lessonId,
    );

    const entity: LessonProgressEntity = {
      id: index >= 0 ? store[index]!.id : `${input.userId}:${input.lessonId}`,
      userId: input.userId,
      lessonId: input.lessonId,
      status: input.status,
      watchedPercent: input.watchedPercent,
      completedAt: input.completedAt,
      updatedAt: now,
    };

    if (index >= 0) {
      store[index] = entity;
    } else {
      store.push(entity);
    }

    return entity;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockLessonProgressStore(): void {
  store = [...mockLessonProgress];
}
