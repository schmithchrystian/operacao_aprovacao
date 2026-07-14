import { mockModules } from "@/mocks";
import type {
  ModuleCreateInput,
  ModuleEntity,
  ModuleRepository,
  ModuleUpdateInput,
} from "../contracts/module-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/modules.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo (Fase 17 — CRUD
 *  administrativo). */
const store = mockStore<ModuleEntity[]>("module", () => [...mockModules]);
const sequence = mockStore<{ value: number }>("module:sequence", () => ({ value: store.length }));

function isVisibleToStudents(module: ModuleEntity): boolean {
  return module.status === "PUBLISHED" && module.deletedAt === null;
}

export class MockModuleRepository implements ModuleRepository {
  async findById(id: string): Promise<ModuleEntity | null> {
    return store.find((module) => module.id === id) ?? null;
  }

  async listByCourseId(courseId: string): Promise<ModuleEntity[]> {
    return store
      .filter((module) => module.courseId === courseId && isVisibleToStudents(module))
      .sort((a, b) => a.order - b.order);
  }

  async listByCourseIdForAdmin(courseId: string): Promise<ModuleEntity[]> {
    return store
      .filter((module) => module.courseId === courseId)
      .sort((a, b) => a.order - b.order);
  }

  async create(input: ModuleCreateInput): Promise<ModuleEntity> {
    sequence.value += 1;
    const siblings = store.filter((module) => module.courseId === input.courseId);
    const nextOrder = input.order ?? siblings.reduce((max, module) => Math.max(max, module.order), 0) + 1;
    const created: ModuleEntity = {
      id: `module-mock-${sequence.value}`,
      courseId: input.courseId,
      subjectId: input.subjectId,
      order: nextOrder,
      slug: input.slug,
      title: input.title,
      description: input.description ?? null,
      teacherId: input.teacherId ?? null,
      status: "DRAFT",
      deletedAt: null,
    };
    store.push(created);
    return created;
  }

  async update(input: ModuleUpdateInput): Promise<ModuleEntity> {
    const index = store.findIndex((module) => module.id === input.id);
    if (index < 0) {
      throw new Error(`[mocks/module] Módulo não encontrado: ${input.id}`);
    }
    const current = store[index]!;
    const updated: ModuleEntity = {
      ...current,
      subjectId: input.subjectId ?? current.subjectId,
      slug: input.slug ?? current.slug,
      title: input.title ?? current.title,
      description: input.description === undefined ? current.description : input.description,
      teacherId: input.teacherId === undefined ? current.teacherId : input.teacherId,
      status: input.status ?? current.status,
    };
    store[index] = updated;
    return updated;
  }

  async softDelete(id: string, now: Date): Promise<ModuleEntity> {
    const index = store.findIndex((module) => module.id === id);
    if (index < 0) {
      throw new Error(`[mocks/module] Módulo não encontrado: ${id}`);
    }
    const updated: ModuleEntity = { ...store[index]!, deletedAt: now.toISOString() };
    store[index] = updated;
    return updated;
  }

  // Assinatura da interface (mesmo padrão de `StudyPlanItemRepository.reorder`); `ModuleEntity`
  // não tem `updatedAt` para tocar, por isso `now` fica sem uso aqui.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async reorder(courseId: string, orderedModuleIds: string[], now: Date): Promise<ModuleEntity[]> {
    const positionById = new Map(orderedModuleIds.map((id, index) => [id, index + 1]));
    const reordered = store.map((module) => {
      if (module.courseId !== courseId) return module;
      const newOrder = positionById.get(module.id);
      if (newOrder === undefined || newOrder === module.order) return module;
      return { ...module, order: newOrder };
    });
    store.splice(0, store.length, ...reordered);
    return this.listByCourseIdForAdmin(courseId);
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockModuleStore(): void {
  store.splice(0, store.length, ...mockModules);
  sequence.value = store.length;
}
