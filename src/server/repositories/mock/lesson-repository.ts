import { mockLessons } from "@/mocks";
import type {
  LessonCreateInput,
  LessonEntity,
  LessonRepository,
  LessonUpdateInput,
} from "../contracts/lesson-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/modules.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo (Fase 17 — CRUD
 *  administrativo). */
const store = mockStore<LessonEntity[]>("lesson", () => [...mockLessons]);
const sequence = mockStore<{ value: number }>("lesson:sequence", () => ({ value: store.length }));

function isVisibleToStudents(lesson: LessonEntity): boolean {
  return lesson.status === "PUBLISHED" && lesson.deletedAt === null;
}

export class MockLessonRepository implements LessonRepository {
  async findById(id: string): Promise<LessonEntity | null> {
    return store.find((lesson) => lesson.id === id) ?? null;
  }

  async listByModuleId(moduleId: string): Promise<LessonEntity[]> {
    return store
      .filter((lesson) => lesson.moduleId === moduleId && isVisibleToStudents(lesson))
      .sort((a, b) => a.order - b.order);
  }

  async listByModuleIdForAdmin(moduleId: string): Promise<LessonEntity[]> {
    return store.filter((lesson) => lesson.moduleId === moduleId).sort((a, b) => a.order - b.order);
  }

  async create(input: LessonCreateInput): Promise<LessonEntity> {
    sequence.value += 1;
    const siblings = store.filter((lesson) => lesson.moduleId === input.moduleId);
    const nextOrder = input.order ?? siblings.reduce((max, lesson) => Math.max(max, lesson.order), 0) + 1;
    const created: LessonEntity = {
      id: `lesson-mock-${sequence.value}`,
      moduleId: input.moduleId,
      order: nextOrder,
      title: input.title,
      durationMinutes: input.durationMinutes,
      requiresLessonId: input.requiresLessonId ?? null,
      videoUrl: input.videoUrl ?? null,
      teacherId: input.teacherId ?? null,
      status: "DRAFT",
      deletedAt: null,
    };
    store.push(created);
    return created;
  }

  async update(input: LessonUpdateInput): Promise<LessonEntity> {
    const index = store.findIndex((lesson) => lesson.id === input.id);
    if (index < 0) {
      throw new Error(`[mocks/lesson] Aula não encontrada: ${input.id}`);
    }
    const current = store[index]!;
    const updated: LessonEntity = {
      ...current,
      title: input.title ?? current.title,
      durationMinutes: input.durationMinutes ?? current.durationMinutes,
      requiresLessonId: input.requiresLessonId === undefined ? current.requiresLessonId : input.requiresLessonId,
      videoUrl: input.videoUrl === undefined ? current.videoUrl : input.videoUrl,
      teacherId: input.teacherId === undefined ? current.teacherId : input.teacherId,
      status: input.status ?? current.status,
    };
    store[index] = updated;
    return updated;
  }

  async softDelete(id: string, now: Date): Promise<LessonEntity> {
    const index = store.findIndex((lesson) => lesson.id === id);
    if (index < 0) {
      throw new Error(`[mocks/lesson] Aula não encontrada: ${id}`);
    }
    const updated: LessonEntity = { ...store[index]!, deletedAt: now.toISOString() };
    store[index] = updated;
    return updated;
  }

  // Assinatura da interface (mesmo padrão de `StudyPlanItemRepository.reorder`); `LessonEntity`
  // não tem `updatedAt` para tocar, por isso `now` fica sem uso aqui.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async reorder(moduleId: string, orderedLessonIds: string[], now: Date): Promise<LessonEntity[]> {
    const positionById = new Map(orderedLessonIds.map((id, index) => [id, index + 1]));
    const reordered = store.map((lesson) => {
      if (lesson.moduleId !== moduleId) return lesson;
      const newOrder = positionById.get(lesson.id);
      if (newOrder === undefined || newOrder === lesson.order) return lesson;
      return { ...lesson, order: newOrder };
    });
    store.splice(0, store.length, ...reordered);
    return this.listByModuleIdForAdmin(moduleId);
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockLessonStore(): void {
  store.splice(0, store.length, ...mockLessons);
  sequence.value = store.length;
}
