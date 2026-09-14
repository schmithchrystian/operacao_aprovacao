import { randomUUID } from "node:crypto";
import type { Topic as Row } from "@/generated/prisma/client";
import type {
  TopicEntity,
  TopicRepository,
  TopicCreateInput,
  TopicUpdateInput,
} from "../contracts/topic-repository";

function map(row: Row): TopicEntity {
  return {
    id: row.id,
    subjectId: row.subjectId,
    name: row.name,
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

export class PrismaTopicRepository implements TopicRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.topic.findUnique({ where: { id } });
    return row ? map(row) : null;
  }
  async listBySubjectId(subjectId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.topic.findMany({
        where: { subjectId, deletedAt: null },
        orderBy: { name: "asc" },
      })
    ).map(map);
  }
  async list() {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.topic.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } })
    ).map(map);
  }
  async listForAdmin() {
    const { prisma } = await import("@/server/db/prisma");
    return (await prisma.topic.findMany({ orderBy: { name: "asc" } })).map(map);
  }
  async create(input: TopicCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { now, ...data } = input;
    return map(
      await prisma.topic.create({
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
  async update(input: TopicUpdateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { id, now, ...data } = input;
    return map(await prisma.topic.update({ where: { id }, data: { ...data, updatedAt: now } }));
  }
  async softDelete(id: string, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.topic.update({ where: { id }, data: { deletedAt: now, updatedAt: now } }),
    );
  }
}
