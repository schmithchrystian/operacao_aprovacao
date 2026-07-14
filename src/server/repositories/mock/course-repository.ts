import { mockCourses } from "@/mocks";
import type {
  CourseCreateInput,
  CourseEntity,
  CourseRepository,
  CourseUpdateInput,
} from "../contracts/course-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/courses.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo (Fase 17 — CRUD
 *  administrativo). */
const store = mockStore<CourseEntity[]>("course", () => [...mockCourses]);
const sequence = mockStore<{ value: number }>("course:sequence", () => ({ value: store.length }));

function isVisibleToStudents(course: CourseEntity): boolean {
  return course.status === "PUBLISHED" && course.deletedAt === null;
}

export class MockCourseRepository implements CourseRepository {
  async findById(id: string): Promise<CourseEntity | null> {
    return store.find((course) => course.id === id) ?? null;
  }

  async findBySlug(slug: string): Promise<CourseEntity | null> {
    return store.find((course) => course.slug === slug) ?? null;
  }

  async list(): Promise<CourseEntity[]> {
    return store.filter(isVisibleToStudents);
  }

  async listByContestId(contestId: string): Promise<CourseEntity[]> {
    return store.filter((course) => course.contestId === contestId && isVisibleToStudents(course));
  }

  async listForAdmin(): Promise<CourseEntity[]> {
    return [...store];
  }

  async create(input: CourseCreateInput): Promise<CourseEntity> {
    sequence.value += 1;
    const course: CourseEntity = {
      id: `course-mock-${sequence.value}`,
      slug: input.slug,
      title: input.title,
      description: input.description,
      contestId: input.contestId,
      contestName: input.contestName,
      teacherName: input.teacherName ?? "A definir",
      workloadHours: input.workloadHours ?? 0,
      coverColor: input.coverColor ?? "#1F2937",
      difficulty: input.difficulty ?? "iniciante",
      status: "DRAFT",
      deletedAt: null,
    };
    store.push(course);
    return course;
  }

  async update(input: CourseUpdateInput): Promise<CourseEntity> {
    const index = store.findIndex((course) => course.id === input.id);
    if (index < 0) {
      throw new Error(`[mocks/course] Curso não encontrado: ${input.id}`);
    }
    const current = store[index]!;
    const updated: CourseEntity = {
      ...current,
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      contestId: input.contestId ?? current.contestId,
      contestName: input.contestName ?? current.contestName,
      teacherName: input.teacherName ?? current.teacherName,
      workloadHours: input.workloadHours ?? current.workloadHours,
      coverColor: input.coverColor ?? current.coverColor,
      difficulty: input.difficulty ?? current.difficulty,
      status: input.status ?? current.status,
    };
    store[index] = updated;
    return updated;
  }

  async softDelete(id: string, now: Date): Promise<CourseEntity> {
    const index = store.findIndex((course) => course.id === id);
    if (index < 0) {
      throw new Error(`[mocks/course] Curso não encontrado: ${id}`);
    }
    const updated: CourseEntity = { ...store[index]!, deletedAt: now.toISOString() };
    store[index] = updated;
    return updated;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockCourseStore(): void {
  store.splice(0, store.length, ...mockCourses);
  sequence.value = store.length;
}
