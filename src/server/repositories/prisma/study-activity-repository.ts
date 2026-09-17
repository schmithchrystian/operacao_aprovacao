export interface StudyActivitySample {
  validSeconds: number;
  lastHeartbeatAt: string;
  activityStartedAt?: string;
  lessonId: string | null;
  subjectId: string | null;
  status: "ACTIVE" | "FINISHED" | "DISCARDED";
}
/** Uses server-accepted cumulative counters only; raw legacy client positions are not valid time. */
export async function listPrismaStudyActivitySamples(
  userId: string,
): Promise<StudyActivitySample[]> {
  const { prisma } = await import("@/server/db/prisma");
  const [video, focus] = await Promise.all([
    prisma.studyActivity.findMany({
      where: { session: { userId, status: { not: "DISCARDED" } }, type: "VIDEO_HEARTBEAT" },
      select: {
        sessionId: true,
        occurredAt: true,
        payload: true,
        session: {
          select: {
            status: true,
            lessonId: true,
            lesson: { select: { module: { select: { subjectId: true } } } },
          },
        },
      },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.focusActivity.findMany({
      where: { session: { userId, status: { not: "DISCARDED" } } },
      select: {
        sessionId: true,
        occurredAt: true,
        payload: true,
        session: { select: { status: true, subjectId: true } },
      },
      orderBy: [{ occurredAt: "asc" }, { heartbeatCount: "asc" }],
    }),
  ]);
  const samples: StudyActivitySample[] = [],
    previous = new Map<string, number>();
  for (const row of video) {
    const value =
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? row.payload.validSeconds
        : null;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
    const key = "video:" + row.sessionId,
      old = previous.get(key) ?? 0,
      delta = Math.max(0, value - old);
    previous.set(key, Math.max(old, value));
    if (delta > 0)
      samples.push({
        validSeconds: delta,
        lastHeartbeatAt: row.occurredAt.toISOString(),
        activityStartedAt: new Date(row.occurredAt.getTime() - delta * 1000).toISOString(),
        lessonId: row.session.lessonId,
        subjectId: row.session.lesson?.module.subjectId ?? null,
        status: row.session.status,
      });
  }
  for (const row of focus) {
    const value =
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? row.payload.activeSeconds
        : null;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
    const key = "focus:" + row.sessionId,
      old = previous.get(key) ?? 0,
      delta = Math.max(0, value - old);
    previous.set(key, Math.max(old, value));
    if (delta > 0)
      samples.push({
        validSeconds: delta,
        lastHeartbeatAt: row.occurredAt.toISOString(),
        activityStartedAt: new Date(row.occurredAt.getTime() - delta * 1000).toISOString(),
        lessonId: null,
        subjectId: row.session.subjectId,
        status: row.session.status,
      });
  }
  return samples.sort((a, b) => a.lastHeartbeatAt.localeCompare(b.lastHeartbeatAt));
}
