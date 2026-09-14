import { z } from "zod";
import type { StudySession as Row } from "@/generated/prisma/client";
import type {
  StudySessionEntity,
  StudySessionRepository,
} from "../contracts/study-session-repository";
const intervals = z.array(
  z.object({ startSeconds: z.number().nonnegative(), endSeconds: z.number().nonnegative() }),
);
function map(row: Row): StudySessionEntity {
  if (
    !row.clientSessionId ||
    !row.lessonId ||
    !row.lastHeartbeatAt ||
    row.lastClientTimestamp === null ||
    row.source !== "LESSON"
  )
    throw new Error("StudySession aggregate backfill required: " + row.id);
  return {
    id: row.clientSessionId,
    userId: row.userId,
    lessonId: row.lessonId,
    source: "LESSON",
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    lastHeartbeatAt: row.lastHeartbeatAt.toISOString(),
    lastPositionSeconds: row.lastPositionSeconds,
    lastClientTimestamp: row.lastClientTimestamp,
    coveredIntervals: intervals.parse(row.coveredIntervals),
    validSeconds: row.validSeconds,
    heartbeatCount: row.heartbeatCount,
    updatedAt: row.updatedAt.toISOString(),
  };
}
export class PrismaStudySessionRepository implements StudySessionRepository {
  async findSession(userId: string, lessonId: string, sessionId: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.studySession.findUnique({
      where: { userId_lessonId_clientSessionId: { userId, lessonId, clientSessionId: sessionId } },
    });
    return row ? map(row) : null;
  }
  async listSessionsByUserAndLesson(userId: string, lessonId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.studySession.findMany({
        where: { userId, lessonId, source: "LESSON", clientSessionId: { not: null } },
        orderBy: { startedAt: "asc" },
      })
    ).map(map);
  }
  async listRecentSessionsByUserId(userId: string, sinceIso: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.studySession.findMany({
        where: {
          userId,
          source: "LESSON",
          clientSessionId: { not: null },
          lastHeartbeatAt: { gte: new Date(sinceIso) },
        },
        orderBy: { lastHeartbeatAt: "desc" },
      })
    ).map(map);
  }
  async saveSession(entity: StudySessionEntity) {
    const { prisma } = await import("@/server/db/prisma");
    const { inRepositoryTransaction } = await import("@/server/repositories/transaction");
    return inRepositoryTransaction(async () => {
      await prisma.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${entity.userId} FOR UPDATE`;
      const where = {
        userId_lessonId_clientSessionId: {
          userId: entity.userId,
          lessonId: entity.lessonId,
          clientSessionId: entity.id,
        },
      };
      const existing = await prisma.studySession.findUnique({ where });
      if (
        existing &&
        (existing.status !== "ACTIVE" ||
          existing.heartbeatCount > entity.heartbeatCount ||
          (existing.lastHeartbeatAt &&
            existing.lastHeartbeatAt.getTime() > new Date(entity.lastHeartbeatAt).getTime()))
      )
        return map(existing);
      const data = {
        userId: entity.userId,
        lessonId: entity.lessonId,
        clientSessionId: entity.id,
        source: entity.source,
        status: entity.status,
        startedAt: new Date(entity.startedAt),
        lastHeartbeatAt: new Date(entity.lastHeartbeatAt),
        lastPositionSeconds: entity.lastPositionSeconds,
        lastClientTimestamp: entity.lastClientTimestamp,
        coveredIntervals: intervals.parse(entity.coveredIntervals),
        validSeconds: Math.max(existing?.validSeconds ?? 0, entity.validSeconds),
        heartbeatCount: entity.heartbeatCount,
        updatedAt: new Date(entity.updatedAt),
      };
      const row = existing
        ? await prisma.studySession.update({ where: { id: existing.id }, data })
        : await prisma.studySession.create({
            data: { ...data, createdAt: new Date(entity.startedAt) },
          });
      if (!existing || entity.heartbeatCount > existing.heartbeatCount)
        await prisma.studyActivity.create({
          data: {
            sessionId: row.id,
            type: "VIDEO_HEARTBEAT",
            occurredAt: new Date(entity.lastHeartbeatAt),
            isValid: entity.validSeconds > (existing?.validSeconds ?? 0),
            payload: {
              clientTimestamp: entity.lastClientTimestamp,
              lastPositionSeconds: entity.lastPositionSeconds,
              validSeconds: entity.validSeconds,
              heartbeatCount: entity.heartbeatCount,
              coveredIntervals: intervals.parse(entity.coveredIntervals),
            },
            createdAt: new Date(entity.updatedAt),
          },
        });
      return map(row);
    });
  }
}
