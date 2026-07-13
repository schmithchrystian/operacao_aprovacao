import { mockLessons } from "@/mocks";
import type { LessonEntity, LessonRepository } from "../contracts/lesson-repository";

/** Implementação mock — lê de `src/mocks/data/modules.ts` (ADR-0011). */
export class MockLessonRepository implements LessonRepository {
  async findById(id: string): Promise<LessonEntity | null> {
    return mockLessons.find((lesson) => lesson.id === id) ?? null;
  }

  async listByModuleId(moduleId: string): Promise<LessonEntity[]> {
    return mockLessons
      .filter((lesson) => lesson.moduleId === moduleId)
      .sort((a, b) => a.order - b.order);
  }
}
