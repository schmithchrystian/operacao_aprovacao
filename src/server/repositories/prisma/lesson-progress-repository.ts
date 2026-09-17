import { randomUUID } from "node:crypto";
import type { LessonProgress as Row } from "@/generated/prisma/client";
import type {
  LessonProgressEntity,
  LessonProgressRepository,
  LessonProgressUpsertInput,
} from "../contracts/lesson-progress-repository";
function map(row: Row): LessonProgressEntity {
  return {
    id: row.id,
    userId: row.userId,
    lessonId: row.lessonId,
    status:
      row.status === "COMPLETED"
        ? "completed"
        : row.status === "IN_PROGRESS"
          ? "in_progress"
          : "not_started",
    watchedPercent: row.watchedPercent,
    completedAt: row.completedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}
export class PrismaLessonProgressRepository implements LessonProgressRepository {
  async findByUserAndLesson(userId: string, lessonId: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    return row ? map(row) : null;
  }
  async listByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.lessonProgress.findMany({ where: { userId }, orderBy: { updatedAt: "asc" } })
    ).map(map);
  }
  async upsert(input: LessonProgressUpsertInput) {
    const { prisma } = await import("@/server/db/prisma");
    if (
      !Number.isFinite(input.watchedPercent) ||
      input.watchedPercent < 0 ||
      input.watchedPercent > 1
    )
      throw new Error("watchedPercent must be a fraction");
    const status = input.status.toUpperCase();
    const completedAt = input.completedAt ? new Date(input.completedAt) : null;
    const rows = await prisma.$queryRaw<
      Row[]
    >`INSERT INTO "LessonProgress" ("id","userId","lessonId","status","watchedPercent","completedAt","createdAt","updatedAt") VALUES (${randomUUID()},${input.userId},${input.lessonId},${status}::"LessonProgressStatus",${input.watchedPercent},${completedAt},NOW(),NOW())
  ON CONFLICT ("userId","lessonId") DO UPDATE SET "status"=CASE WHEN "LessonProgress"."status"='COMPLETED' THEN "LessonProgress"."status" WHEN "LessonProgress"."status"='IN_PROGRESS' AND EXCLUDED."status"='NOT_STARTED' THEN "LessonProgress"."status" ELSE EXCLUDED."status" END,"watchedPercent"=GREATEST("LessonProgress"."watchedPercent",EXCLUDED."watchedPercent"),"completedAt"=COALESCE("LessonProgress"."completedAt",EXCLUDED."completedAt"),"updatedAt"=NOW() RETURNING *`;
    return map(rows[0]!);
  }
}
