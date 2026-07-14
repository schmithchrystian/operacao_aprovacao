import type {
  NotificationCreateInput,
  NotificationEntity,
  NotificationRepository,
} from "../contracts/notification-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaNotificationRepository implements NotificationRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<NotificationEntity[]> {
    throw new Error("not implemented: PrismaNotificationRepository.listByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async createMany(_inputs: NotificationCreateInput[]): Promise<NotificationEntity[]> {
    throw new Error("not implemented: PrismaNotificationRepository.createMany");
  }
}
