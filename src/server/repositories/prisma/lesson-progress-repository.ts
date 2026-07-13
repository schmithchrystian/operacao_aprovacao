import type {
  LessonProgressEntity,
  LessonProgressRepository,
} from "../contracts/lesson-progress-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`study-tracking` a partir da
 * Fase de banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002).
 */
export class PrismaLessonProgressRepository implements LessonProgressRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByUserAndLesson(_userId: string, _lessonId: string): Promise<LessonProgressEntity | null> {
    throw new Error("not implemented: PrismaLessonProgressRepository.findByUserAndLesson");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<LessonProgressEntity[]> {
    throw new Error("not implemented: PrismaLessonProgressRepository.listByUserId");
  }
}
