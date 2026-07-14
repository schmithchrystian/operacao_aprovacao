/**
 * Entidade de domínio de notificação (`Notification`, docs/DATA-MODEL.md). Fase 17 — agente
 * `backend` (admin — "publicar avisos"); primeiro repositório real para este domínio. Espelha
 * `NotificationType` do Prisma.
 */
export type NotificationKind =
  | "ACHIEVEMENT_UNLOCKED"
  | "LEVEL_UP"
  | "GOAL_COMPLETED"
  | "STREAK_AT_RISK"
  | "STREAK_LOST"
  | "RANKING_UPDATE"
  | "COURSE_ANNOUNCEMENT"
  | "SUBSCRIPTION"
  | "SYSTEM";

export interface NotificationEntity {
  id: string;
  userId: string;
  type: NotificationKind;
  title: string;
  message: string;
  data: unknown;
  isRead: boolean;
  createdAt: string;
}

/** Um destinatário de um broadcast administrativo (Fase 17 — "Avisos: publicar"). */
export interface NotificationCreateInput {
  userId: string;
  type: NotificationKind;
  title: string;
  message: string;
  data?: unknown;
  now: Date;
}

/** Abstração de persistência para notificações (ADR-0002). */
export interface NotificationRepository {
  /** Mais recentes primeiro. */
  listByUserId(userId: string): Promise<NotificationEntity[]>;
  /** Fase 17 (admin) — cria uma notificação por destinatário informado (broadcast). Sem
   *  "id de lote" (TODO — não há coluna equivalente em `Notification`, docs/DATA-MODEL.md);
   *  cada linha é independente mesmo quando criada pelo mesmo broadcast. */
  createMany(inputs: NotificationCreateInput[]): Promise<NotificationEntity[]>;
}
