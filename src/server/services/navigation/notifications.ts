import { requireUser } from "@/server/authorization";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
export interface NotificationDTO {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
export interface NotificationPageDTO {
  items: NotificationDTO[];
  unreadCount: number;
  total: number;
  page: number;
}
export async function listMyNotifications(page = 1): Promise<NotificationPageDTO> {
  const { userId } = await requireUser();
  const all = await getRepositories().notifications.listByUserId(userId);
  return {
    page,
    total: all.length,
    unreadCount: all.filter((row) => !row.isRead).length,
    items: all
      .slice((page - 1) * 20, page * 20)
      .map(({ id, title, message, isRead, createdAt }) => ({
        id,
        title,
        message,
        isRead,
        createdAt,
      })),
  };
}
export async function markMyNotificationRead(id: string): Promise<void> {
  const { userId } = await requireUser();
  if (!(await getRepositories().notifications.markRead(userId, id)))
    throw new NotFoundError("Notificação não encontrada.");
}
