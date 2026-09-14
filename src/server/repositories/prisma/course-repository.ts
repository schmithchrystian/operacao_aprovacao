import type { Prisma } from "@/generated/prisma/client";
import type {
  CourseEntity,
  CourseRepository,
  CourseCreateInput,
  CourseUpdateInput,
} from "../contracts/course-repository";
type Row = Prisma.CourseGetPayload<{ include: { contest: true } }>;
function map(row: Row): CourseEntity {
  if (!row.contestId || !row.contest)
    throw new Error("Course requires a contest before use: " + row.id);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    contestId: row.contestId,
    contestName: row.contest.name,
    teacherName: row.teacherName,
    workloadHours: row.workloadHours,
    coverColor: row.coverColor,
    difficulty: row.difficulty,
    status: row.status,
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}
export class PrismaCourseRepository implements CourseRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.course.findUnique({ where: { id }, include: { contest: true } });
    return row ? map(row) : null;
  }
  async findBySlug(slug: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.course.findUnique({ where: { slug }, include: { contest: true } });
    return row ? map(row) : null;
  }
  async list() {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.course.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        include: { contest: true },
        orderBy: { title: "asc" },
      })
    ).map(map);
  }
  async listByContestId(contestId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.course.findMany({
        where: { contestId, status: "PUBLISHED", deletedAt: null },
        include: { contest: true },
        orderBy: { title: "asc" },
      })
    ).map(map);
  }
  async listForAdmin() {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.course.findMany({ include: { contest: true }, orderBy: { title: "asc" } })
    ).map(map);
  }
  async create(input: CourseCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { now, contestName, ...data } = input;
    void contestName;
    return map(
      await prisma.course.create({
        data: { ...data, createdAt: now, updatedAt: now },
        include: { contest: true },
      }),
    );
  }
  async update(input: CourseUpdateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { id, now, contestName, ...data } = input;
    void contestName;
    return map(
      await prisma.course.update({
        where: { id },
        data: { ...data, updatedAt: now },
        include: { contest: true },
      }),
    );
  }
  async softDelete(id: string, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.course.update({
        where: { id },
        data: { deletedAt: now, updatedAt: now },
        include: { contest: true },
      }),
    );
  }
}
