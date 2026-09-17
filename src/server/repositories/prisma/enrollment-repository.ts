import { randomUUID } from "node:crypto";
import type { Enrollment as Row } from "@/generated/prisma/client";
import type { EnrollmentEntity, EnrollmentRepository } from "../contracts/enrollment-repository";
function map(row: Row): EnrollmentEntity {
  return {
    id: row.id,
    userId: row.userId,
    courseId: row.courseId,
    status:
      row.cancelledAt !== null || (row.expiresAt !== null && row.expiresAt.getTime() <= Date.now())
        ? "cancelled"
        : row.status === "ACTIVE"
          ? "active"
          : row.status === "COMPLETED"
            ? "completed"
            : "cancelled",
    enrolledAt: row.enrolledAt.toISOString(),
  };
}
export class PrismaEnrollmentRepository implements EnrollmentRepository {
  async findByUserAndCourse(userId: string, courseId: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    return row ? map(row) : null;
  }
  async listByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.enrollment.findMany({ where: { userId }, orderBy: { enrolledAt: "asc" } })
    ).map(map);
  }
  async create(input: { userId: string; courseId: string }) {
    const { prisma } = await import("@/server/db/prisma");
    const rows = await prisma.$queryRaw<
      Row[]
    >`INSERT INTO "Enrollment" ("id", "userId", "courseId", "updatedAt") VALUES (${randomUUID()}, ${input.userId}, ${input.courseId}, NOW()) ON CONFLICT ("userId", "courseId") DO UPDATE SET "userId" = "Enrollment"."userId" RETURNING *`;
    return map(rows[0]!);
  }
}
