import { Prisma, type GamificationEvent as Row } from "@/generated/prisma/client";
import type {
  GamificationEventRepository,
  GamificationEventEntity,
  GamificationEventCreateInput,
} from "../contracts/gamification-event-repository";
function map(row: Row): GamificationEventEntity {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    idempotencyKey: row.idempotencyKey,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    points: row.points,
    xp: row.xp,
    ruleVersion: row.ruleVersion,
    context:
      row.context && typeof row.context === "object" && !Array.isArray(row.context)
        ? row.context
        : null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}
export class PrismaGamificationEventRepository implements GamificationEventRepository {
  async findByIdempotencyKey(key: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.gamificationEvent.findUnique({ where: { idempotencyKey: key } });
    return row ? map(row) : null;
  }
  async create(input: GamificationEventCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { now, context, ...rest } = input;
    const data = {
      ...rest,
      context:
        context === undefined
          ? Prisma.DbNull
          : (JSON.parse(JSON.stringify(context)) as Prisma.InputJsonValue),
      createdAt: now,
      processedAt: input.status === "PROCESSED" ? now : null,
    };
    const rows = await prisma.gamificationEvent.createManyAndReturn({
      data: [data],
      skipDuplicates: true,
    });
    return map(
      rows[0] ??
        (await prisma.gamificationEvent.findUniqueOrThrow({
          where: { idempotencyKey: input.idempotencyKey },
        })),
    );
  }
  async listByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.gamificationEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
    ).map(map);
  }
}
