import type {
  StudyMissionCreateInput,
  StudyMissionEntity,
  StudyMissionRepository,
} from "../contracts/study-mission-repository";
import { mockStore } from "./mock-store";

/**
 * Implementação mock — em memória de processo, sem seed inicial (uma missão só nasce quando o
 * aluno clica em "Iniciar missão de estudo"; mesma decisão de `MockStudySessionRepository`).
 * Estado via `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo.
 */
const store = mockStore<StudyMissionEntity[]>("study-mission", () => []);
const sequence = mockStore<{ value: number }>("study-mission:sequence", () => ({ value: 0 }));

export class MockStudyMissionRepository implements StudyMissionRepository {
  async findById(userId: string, id: string): Promise<StudyMissionEntity | null> {
    return store.find((mission) => mission.id === id && mission.userId === userId) ?? null;
  }

  async listByUserId(userId: string): Promise<StudyMissionEntity[]> {
    return store.filter(row => row.userId === userId).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
  async advance(userId: string, id: string, expectedBlockIndex: number, now: Date): Promise<StudyMissionEntity | null> {
    const row = store.find(mission => mission.id === id && mission.userId === userId);
    if (!row || row.currentBlockIndex !== expectedBlockIndex || row.status === "DISCARDED") return null;
    if (row.status === "FINISHED") return row;
    if (row.currentBlockIndex + 1 >= row.blocks.length) row.status = "FINISHED";
    else row.currentBlockIndex += 1;
    row.updatedAt = now.toISOString();
    return row;
  }

  async create(input: StudyMissionCreateInput): Promise<StudyMissionEntity> {
    sequence.value += 1;
    const nowIso = input.now.toISOString();
    const mission: StudyMissionEntity = {
      id: `study-mission-mock-${sequence.value}`,
      userId: input.userId,
      status: "ACTIVE",
      blocks: input.blocks,
      currentBlockIndex: 0,
      totalMinutes: input.totalMinutes,
      startedAt: nowIso,
      updatedAt: nowIso,
    };
    store.push(mission);
    return mission;
  }
}

/** Uso exclusivo de testes — limpa todo o store em memória. */
export function __resetMockStudyMissionStore(): void {
  store.splice(0, store.length);
  sequence.value = 0;
}
