import { mockSubjects } from "@/mocks";
import type { SubjectEntity, SubjectRepository } from "../contracts/subject-repository";

/** Implementação mock — lê de `src/mocks/data/subjects.ts` (ADR-0011). */
export class MockSubjectRepository implements SubjectRepository {
  async findById(id: string): Promise<SubjectEntity | null> {
    return mockSubjects.find((subject) => subject.id === id) ?? null;
  }

  async list(): Promise<SubjectEntity[]> {
    return [...mockSubjects];
  }
}
