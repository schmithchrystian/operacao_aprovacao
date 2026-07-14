import { mockSubjects } from "@/mocks";
import type {
  SubjectCreateInput,
  SubjectEntity,
  SubjectRepository,
  SubjectUpdateInput,
} from "../contracts/subject-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/subjects.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo (Fase 17 — CRUD
 *  administrativo). */
const store = mockStore<SubjectEntity[]>("subject", () => [...mockSubjects]);
const sequence = mockStore<{ value: number }>("subject:sequence", () => ({ value: store.length }));

export class MockSubjectRepository implements SubjectRepository {
  async findById(id: string): Promise<SubjectEntity | null> {
    return store.find((subject) => subject.id === id) ?? null;
  }

  async list(): Promise<SubjectEntity[]> {
    return store.filter((subject) => subject.deletedAt === null);
  }

  async listForAdmin(): Promise<SubjectEntity[]> {
    return [...store];
  }

  async create(input: SubjectCreateInput): Promise<SubjectEntity> {
    sequence.value += 1;
    const created: SubjectEntity = {
      id: `subject-mock-${sequence.value}`,
      name: input.name,
      deletedAt: null,
    };
    store.push(created);
    return created;
  }

  async update(input: SubjectUpdateInput): Promise<SubjectEntity> {
    const index = store.findIndex((subject) => subject.id === input.id);
    if (index < 0) {
      throw new Error(`[mocks/subject] Matéria não encontrada: ${input.id}`);
    }
    const current = store[index]!;
    const updated: SubjectEntity = { ...current, name: input.name ?? current.name };
    store[index] = updated;
    return updated;
  }

  async softDelete(id: string, now: Date): Promise<SubjectEntity> {
    const index = store.findIndex((subject) => subject.id === id);
    if (index < 0) {
      throw new Error(`[mocks/subject] Matéria não encontrada: ${id}`);
    }
    const updated: SubjectEntity = { ...store[index]!, deletedAt: now.toISOString() };
    store[index] = updated;
    return updated;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockSubjectStore(): void {
  store.splice(0, store.length, ...mockSubjects);
  sequence.value = store.length;
}
