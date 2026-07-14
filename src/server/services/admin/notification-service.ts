import type { BroadcastNotificationInput, BroadcastResultDTO } from "@/contracts/admin-notifications";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { getRepositories } from "@/server/repositories";
import { CONTENT_MANAGE_ROLES } from "./roles";

/**
 * Publicação de avisos (Fase 17 — "Avisos: publicar", versão MÍNIMA). Cria uma `Notification`
 * por destinatário ATIVO (`isActive: true`) — usuários desativados nunca recebem avisos. Sem
 * segmentação livre por `userId` (só "todos" ou "por papel", ver `@/contracts/admin-notifications`).
 */
export const broadcastNotificationForAdmin = withAdminAudit(
  { operation: "admin.notifications.broadcast", entity: "Notification", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: BroadcastNotificationInput, now: Date): Promise<BroadcastResultDTO> => {
    const repos = getRepositories();
    const users = await repos.users.list();
    const recipients = users.filter(
      (user) => user.isActive && (input.roles === undefined || input.roles.includes(user.role)),
    );

    await repos.notifications.createMany(
      recipients.map((user) => ({
        userId: user.id,
        type: input.type,
        title: input.title,
        message: input.message,
        now,
      })),
    );

    return { recipientCount: recipients.length };
  },
);
