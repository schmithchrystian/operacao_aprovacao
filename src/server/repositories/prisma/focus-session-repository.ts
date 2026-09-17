import type { FocusSession as Row, FocusMode as DbMode } from "@/generated/prisma/client";
import type {
  FocusSessionEntity,
  FocusSessionRepository,
  FocusSessionCreateInput,
  FocusMode,
} from "../contracts/focus-session-repository";
const toDb: Record<FocusMode, DbMode> = {
  "25_5": "FOCUS_25_5",
  "50_10": "FOCUS_50_10",
  quick_15: "QUICK_15",
  intense_90: "INTENSE_90",
  free: "FREE",
  custom: "CUSTOM",
};
const toDomain: Record<DbMode, FocusMode> = {
  FOCUS_25_5: "25_5",
  FOCUS_50_10: "50_10",
  QUICK_15: "quick_15",
  INTENSE_90: "intense_90",
  FREE: "free",
  CUSTOM: "custom",
};
function map(row: Row): FocusSessionEntity {
  return {
    id: row.id,
    userId: row.userId,
    mode: toDomain[row.mode],
    status: row.status,
    targetSeconds: row.targetSeconds,
    breakSeconds: row.breakSeconds,
    subjectId: row.subjectId,
    topicId: row.topicId,
    objective: row.objective,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    lastHeartbeatAt: row.lastHeartbeatAt.toISOString(),
    lastClientTimestamp: row.lastClientTimestamp,
    activeSeconds: row.activeSeconds,
    heartbeatCount: row.heartbeatCount,
    validHeartbeatCount: row.validHeartbeatCount,
    cyclesPlanned: row.cyclesPlanned,
    cyclesCompleted: row.cyclesCompleted,
    goalAchieved: row.goalAchieved,
    contentStudied: row.contentStudied,
    focusLevel: row.focusLevel,
    doubtNote: row.doubtNote,
    scored: row.scored,
    updatedAt: row.updatedAt.toISOString(),
  };
}
export class PrismaFocusSessionRepository implements FocusSessionRepository {
  async findById(userId: string, id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.focusSession.findFirst({ where: { id, userId } });
    return row ? map(row) : null;
  }
  async findActiveByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.focusSession.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
    });
    return row ? map(row) : null;
  }
  async create(input: FocusSessionCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    return inRepositoryTransaction(async () => {
      await prisma.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${input.userId} FOR UPDATE`;
      const existing = await prisma.focusSession.findFirst({
        where: { userId: input.userId, status: "ACTIVE" },
      });
      if (existing) return map(existing);
      const { now, mode, ...data } = input;
      return map(
        await prisma.focusSession.create({
          data: { ...data, mode: toDb[mode], startedAt: now, lastHeartbeatAt: now, updatedAt: now },
        }),
      );
    });
  }
  async save(entity: FocusSessionEntity) {
    const { prisma } = await import("@/server/db/prisma");
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    return inRepositoryTransaction(async () => {
      await prisma.$queryRaw`SELECT "id" FROM "FocusSession" WHERE "id"=${entity.id} AND "userId"=${entity.userId} FOR UPDATE`;
      const existing = await prisma.focusSession.findFirst({
        where: { id: entity.id, userId: entity.userId },
      });
      if (!existing) throw new Error("Focus session not found");
      if (
        existing.status !== "ACTIVE" ||
        existing.heartbeatCount > entity.heartbeatCount ||
        existing.lastHeartbeatAt.getTime() > new Date(entity.lastHeartbeatAt).getTime()
      )
        return map(existing);
      const { id, userId, mode, startedAt, endedAt, lastHeartbeatAt, updatedAt, ...data } = entity;
      void userId;
      void startedAt;
      const row = await prisma.focusSession.update({
        where: { id },
        data: {
          ...data,
          mode: toDb[mode],
          endedAt: endedAt ? new Date(endedAt) : null,
          lastHeartbeatAt: new Date(lastHeartbeatAt),
          updatedAt: new Date(updatedAt),
          activeSeconds: Math.max(existing.activeSeconds, entity.activeSeconds),
          scored: existing.scored || entity.scored,
        },
      });
      if (entity.heartbeatCount > existing.heartbeatCount)
        await prisma.focusActivity.create({
          data: {
            sessionId: id,
            heartbeatCount: entity.heartbeatCount,
            occurredAt: new Date(lastHeartbeatAt),
            payload: {
              clientTimestamp: entity.lastClientTimestamp,
              activeSeconds: entity.activeSeconds,
              validHeartbeatCount: entity.validHeartbeatCount,
            },
          },
        });
      return map(row);
    });
  }
}
