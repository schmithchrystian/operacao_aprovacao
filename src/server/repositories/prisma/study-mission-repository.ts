import type {
  StudyMissionCreateInput,
  StudyMissionEntity,
  StudyMissionRepository,
} from "../contracts/study-mission-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`study-tracking` a partir da
 * Fase de banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002). Ver limitação/mapeamento documentado em
 * `../contracts/study-mission-repository.ts` (`StudySession(source: FREE)` +
 * `StudyActivity(type: NAVIGATION)`).
 */
export class PrismaStudyMissionRepository implements StudyMissionRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_userId: string, _id: string): Promise<StudyMissionEntity | null> {
    throw new Error("not implemented: PrismaStudyMissionRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: StudyMissionCreateInput): Promise<StudyMissionEntity> {
    throw new Error("not implemented: PrismaStudyMissionRepository.create");
  }
}
