import { mockLessonProgress } from "@/mocks";
import type {
  LessonProgressEntity,
  LessonProgressRepository,
} from "../contracts/lesson-progress-repository";

/** Implementação mock — lê de `src/mocks/data/lesson-progress.ts` (ADR-0011). */
export class MockLessonProgressRepository implements LessonProgressRepository {
  async findByUserAndLesson(userId: string, lessonId: string): Promise<LessonProgressEntity | null> {
    return (
      mockLessonProgress.find(
        (progress) => progress.userId === userId && progress.lessonId === lessonId,
      ) ?? null
    );
  }

  async listByUserId(userId: string): Promise<LessonProgressEntity[]> {
    return mockLessonProgress.filter((progress) => progress.userId === userId);
  }
}
