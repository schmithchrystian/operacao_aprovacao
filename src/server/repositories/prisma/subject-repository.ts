import { randomUUID } from "node:crypto";
import type { Subject as Row } from "@/generated/prisma/client";
import type {
  SubjectEntity,
  SubjectRepository,
  SubjectCreateInput,
  SubjectUpdateInput,
} from "../contracts/subject-repository";

function map(row: Row): SubjectEntity {
  return { id: row.id, name: row.name, deletedAt: row.deletedAt?.toISOString() ?? null };
}

export class PrismaSubjectRepository implements SubjectRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.subject.findUnique({ where: { id } });
    return row ? map(row) : null;
  }
  async list() {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.subject.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } })
    ).map(map);
  }
  async listForAdmin() {
    const { prisma } = await import("@/server/db/prisma");
    return (await prisma.subject.findMany({ orderBy: { name: "asc" } })).map(map);
  }
  async create(input: SubjectCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { now, ...data } = input;
    return map(
      await prisma.subject.create({
        data: {
          ...data,
          slug:
            input.name
              .normalize("NFKD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") +
            "-" +
            randomUUID(),
          createdAt: now,
          updatedAt: now,
        },
      }),
    );
  }
  async update(input: SubjectUpdateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { id, now, ...data } = input;
    return map(await prisma.subject.update({ where: { id }, data: { ...data, updatedAt: now } }));
  }
  async softDelete(id: string, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.subject.update({ where: { id }, data: { deletedAt: now, updatedAt: now } }),
    );
  }
}
