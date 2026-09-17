import { Prisma, type Notification as Row } from "@/generated/prisma/client";
import type {
  NotificationEntity,
  NotificationRepository,
  NotificationCreateInput,
} from "../contracts/notification-repository";
function map(row: Row): NotificationEntity {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    message: row.message,
    data: row.data,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}
function json(value: unknown) {
  return value === undefined || value === null
    ? Prisma.DbNull
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}
export class PrismaNotificationRepository implements NotificationRepository {
  async listByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.notification.findMany({
        where: { userId },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      })
    ).map(map);
  }
  async markRead(userId: string, id: string): Promise<boolean> {
    const { prisma } = await import("@/server/db/prisma");
    const result = await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    return result.count === 1;
  }
  async createMany(inputs: NotificationCreateInput[]) {
    const { prisma } = await import("@/server/db/prisma");
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    return inRepositoryTransaction(async () => {
      const rows: NotificationEntity[] = [];
      for (const { now, data, ...input } of inputs)
        rows.push(
          map(
            await prisma.notification.create({
              data: { ...input, data: json(data), createdAt: now },
            }),
          ),
        );
      return rows;
    });
  }
}
