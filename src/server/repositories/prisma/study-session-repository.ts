import type {
  StudySessionEntity,
  StudySessionRepository,
} from "../contracts/study-session-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`study-tracking` a partir da
 * Fase de banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002). Ver limitação documentada em `contracts/study-session-repository.ts` sobre a
 * reconciliação `StudyActivity` (append-only) → `StudySession` (agregado).
 */
export class PrismaStudySessionRepository implements StudySessionRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findSession(_userId: string, _lessonId: string, _sessionId: string): Promise<StudySessionEntity | null> {
    throw new Error("not implemented: PrismaStudySessionRepository.findSession");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async saveSession(_entity: StudySessionEntity): Promise<StudySessionEntity> {
    throw new Error("not implemented: PrismaStudySessionRepository.saveSession");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listSessionsByUserAndLesson(_userId: string, _lessonId: string): Promise<StudySessionEntity[]> {
    throw new Error("not implemented: PrismaStudySessionRepository.listSessionsByUserAndLesson");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listRecentSessionsByUserId(_userId: string, _sinceIso: string): Promise<StudySessionEntity[]> {
    throw new Error("not implemented: PrismaStudySessionRepository.listRecentSessionsByUserId");
  }
}
