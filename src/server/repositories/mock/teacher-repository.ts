import { mockTeachers } from "@/mocks";
import type {
  TeacherCreateInput,
  TeacherEntity,
  TeacherRepository,
  TeacherUpdateInput,
} from "../contracts/teacher-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/teachers.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo (Fase 17). */
const store = mockStore<TeacherEntity[]>("teacher", () => [...mockTeachers]);
const sequence = mockStore<{ value: number }>("teacher:sequence", () => ({ value: store.length }));

export class MockTeacherRepository implements TeacherRepository {
  async findById(id: string): Promise<TeacherEntity | null> {
    return store.find((teacher) => teacher.id === id) ?? null;
  }

  async list(): Promise<TeacherEntity[]> {
    return store.filter((teacher) => teacher.deletedAt === null);
  }

  async listForAdmin(): Promise<TeacherEntity[]> {
    return [...store];
  }

  async create(input: TeacherCreateInput): Promise<TeacherEntity> {
    sequence.value += 1;
    const created: TeacherEntity = {
      id: `teacher-mock-${sequence.value}`,
      userId: input.userId ?? null,
      name: input.name,
      bio: input.bio ?? null,
      avatarUrl: input.avatarUrl ?? null,
      deletedAt: null,
    };
    store.push(created);
    return created;
  }

  async update(input: TeacherUpdateInput): Promise<TeacherEntity> {
    const index = store.findIndex((teacher) => teacher.id === input.id);
    if (index < 0) {
      throw new Error(`[mocks/teacher] Professor não encontrado: ${input.id}`);
    }
    const current = store[index]!;
    const updated: TeacherEntity = {
      ...current,
      name: input.name ?? current.name,
      bio: input.bio === undefined ? current.bio : input.bio,
      avatarUrl: input.avatarUrl === undefined ? current.avatarUrl : input.avatarUrl,
    };
    store[index] = updated;
    return updated;
  }

  async softDelete(id: string, now: Date): Promise<TeacherEntity> {
    const index = store.findIndex((teacher) => teacher.id === id);
    if (index < 0) {
      throw new Error(`[mocks/teacher] Professor não encontrado: ${id}`);
    }
    const updated: TeacherEntity = { ...store[index]!, deletedAt: now.toISOString() };
    store[index] = updated;
    return updated;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockTeacherStore(): void {
  store.splice(0, store.length, ...mockTeachers);
  sequence.value = store.length;
}
