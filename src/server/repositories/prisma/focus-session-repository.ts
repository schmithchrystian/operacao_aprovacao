import type {
  FocusSessionCreateInput,
  FocusSessionEntity,
  FocusSessionRepository,
} from "../contracts/focus-session-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`study-tracking` a partir da Fase
 * de banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002). Ver mapeamento documentado em `../contracts/focus-session-repository.ts`
 * (`StudySession(source: POMODORO | FREE)` + `StudyActivity(type: POMODORO_TICK)`).
 */
export class PrismaFocusSessionRepository implements FocusSessionRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_userId: string, _id: string): Promise<FocusSessionEntity | null> {
    throw new Error("not implemented: PrismaFocusSessionRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findActiveByUserId(_userId: string): Promise<FocusSessionEntity | null> {
    throw new Error("not implemented: PrismaFocusSessionRepository.findActiveByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: FocusSessionCreateInput): Promise<FocusSessionEntity> {
    throw new Error("not implemented: PrismaFocusSessionRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async save(_entity: FocusSessionEntity): Promise<FocusSessionEntity> {
    throw new Error("not implemented: PrismaFocusSessionRepository.save");
  }
}
