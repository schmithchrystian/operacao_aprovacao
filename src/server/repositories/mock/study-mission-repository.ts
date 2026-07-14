import type {
  StudyMissionCreateInput,
  StudyMissionEntity,
  StudyMissionRepository,
} from "../contracts/study-mission-repository";

/**
 * Implementação mock — em memória de processo, sem seed inicial (uma missão só nasce quando o
 * aluno clica em "Iniciar missão de estudo"; mesma decisão de `MockStudySessionRepository`).
 */
let store: StudyMissionEntity[] = [];
let sequence = 0;

export class MockStudyMissionRepository implements StudyMissionRepository {
  async findById(userId: string, id: string): Promise<StudyMissionEntity | null> {
    return store.find((mission) => mission.id === id && mission.userId === userId) ?? null;
  }

  async create(input: StudyMissionCreateInput): Promise<StudyMissionEntity> {
    sequence += 1;
    const nowIso = input.now.toISOString();
    const mission: StudyMissionEntity = {
      id: `study-mission-mock-${sequence}`,
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
  store = [];
  sequence = 0;
}
