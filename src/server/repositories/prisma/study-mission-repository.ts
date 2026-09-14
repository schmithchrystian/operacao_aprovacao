import { z } from "zod";
import type { StudyMission as Row } from "@/generated/prisma/client";
import type {
  StudyMissionEntity,
  StudyMissionRepository,
  StudyMissionCreateInput,
} from "../contracts/study-mission-repository";
const blocksSchema = z.array(
  z.object({
    type: z.enum([
      "videoaula",
      "pdf",
      "questoes",
      "flashcards",
      "revisao",
      "simulado",
      "resumo",
      "mapa_mental",
    ]),
    label: z.string(),
    title: z.string(),
    minutes: z.number().nonnegative(),
    contentRef: z
      .object({
        kind: z.enum(["lesson", "mock_exam", "question_set", "generic"]),
        id: z.string().nullable(),
        title: z.string(),
        href: z.string().nullable(),
      })
      .nullable(),
  }),
);
function map(row: Row): StudyMissionEntity {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    blocks: blocksSchema.parse(row.blocks),
    currentBlockIndex: row.currentBlockIndex,
    totalMinutes: row.totalMinutes,
    startedAt: row.startedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export class PrismaStudyMissionRepository implements StudyMissionRepository {
  async findById(userId: string, id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.studyMission.findFirst({ where: { id, userId } });
    return row ? map(row) : null;
  }
  async listByUserId(userId: string): Promise<StudyMissionEntity[]> {
    const { prisma } = await import("@/server/db/prisma");
    return (await prisma.studyMission.findMany({ where: { userId }, orderBy: [{ startedAt: "desc" }, { id: "asc" }] })).map(map);
  }
  async advance(userId: string, id: string, expectedBlockIndex: number, now: Date): Promise<StudyMissionEntity | null> {
    const { prisma } = await import("@/server/db/prisma");
    const row = await this.findById(userId, id);
    if (!row || row.currentBlockIndex !== expectedBlockIndex || row.status === "DISCARDED") return null;
    if (row.status === "FINISHED") return row;
    const finished = expectedBlockIndex + 1 >= row.blocks.length;
    const updated = await prisma.studyMission.updateMany({
      where: { id, userId, status: "ACTIVE", currentBlockIndex: expectedBlockIndex },
      data: { currentBlockIndex: finished ? expectedBlockIndex : expectedBlockIndex + 1, status: finished ? "FINISHED" : "ACTIVE", updatedAt: now },
    });
    return updated.count === 1 ? this.findById(userId, id) : null;
  }
  async create({ now, blocks, ...data }: StudyMissionCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    return map(
      await prisma.studyMission.create({
        data: { ...data, blocks: blocksSchema.parse(blocks), startedAt: now, updatedAt: now },
      }),
    );
  }
}
