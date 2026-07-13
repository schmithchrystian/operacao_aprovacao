import { mockModules } from "@/mocks";
import type { ModuleEntity, ModuleRepository } from "../contracts/module-repository";

/** Implementação mock — lê de `src/mocks/data/modules.ts` (ADR-0011). */
export class MockModuleRepository implements ModuleRepository {
  async findById(id: string): Promise<ModuleEntity | null> {
    return mockModules.find((module) => module.id === id) ?? null;
  }

  async listByCourseId(courseId: string): Promise<ModuleEntity[]> {
    return mockModules
      .filter((module) => module.courseId === courseId)
      .sort((a, b) => a.order - b.order);
  }
}
