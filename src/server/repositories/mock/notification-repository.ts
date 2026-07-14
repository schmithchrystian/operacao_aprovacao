import type {
  NotificationCreateInput,
  NotificationEntity,
  NotificationRepository,
} from "../contracts/notification-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — sem seed (nenhum aviso publicado até um admin usar a Fase 17). Estado
 *  via `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo. */
const store = mockStore<NotificationEntity[]>("notification", () => []);
const sequence = mockStore<{ value: number }>("notification:sequence", () => ({ value: 0 }));

export class MockNotificationRepository implements NotificationRepository {
  async listByUserId(userId: string): Promise<NotificationEntity[]> {
    return store
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createMany(inputs: NotificationCreateInput[]): Promise<NotificationEntity[]> {
    const created = inputs.map((input): NotificationEntity => {
      sequence.value += 1;
      return {
        id: `notification-mock-${sequence.value}`,
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data ?? null,
        isRead: false,
        createdAt: input.now.toISOString(),
      };
    });
    store.push(...created);
    return created;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao estado vazio inicial. */
export function __resetMockNotificationStore(): void {
  store.splice(0, store.length);
  sequence.value = 0;
}
