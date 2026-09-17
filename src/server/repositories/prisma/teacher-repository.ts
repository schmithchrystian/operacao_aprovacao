import type { Teacher as Row } from "@/generated/prisma/client";
import type {
  TeacherEntity,
  TeacherRepository,
  TeacherCreateInput,
  TeacherUpdateInput,
} from "../contracts/teacher-repository";

function map(row: Row): TeacherEntity {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

export class PrismaTeacherRepository implements TeacherRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.teacher.findUnique({ where: { id } });
    return row ? map(row) : null;
  }
  async list() {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.teacher.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } })
    ).map(map);
  }
  async listForAdmin() {
    const { prisma } = await import("@/server/db/prisma");
    return (await prisma.teacher.findMany({ orderBy: { name: "asc" } })).map(map);
  }
  async create(input: TeacherCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { now, ...data } = input;
    return map(await prisma.teacher.create({ data: { ...data, createdAt: now, updatedAt: now } }));
  }
  async update(input: TeacherUpdateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { id, now, ...data } = input;
    return map(await prisma.teacher.update({ where: { id }, data: { ...data, updatedAt: now } }));
  }
  async softDelete(id: string, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.teacher.update({ where: { id }, data: { deletedAt: now, updatedAt: now } }),
    );
  }
}
