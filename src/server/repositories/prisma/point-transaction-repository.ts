import type { PointTransaction as Row } from "@/generated/prisma/client";
import type {
  PointTransactionRepository,
  PointTransactionEntity,
  PointTransactionCreateInput,
} from "../contracts/point-transaction-repository";
function map(row: Row): PointTransactionEntity {
  return { ...row, createdAt: row.createdAt.toISOString() };
}
export class PrismaPointTransactionRepository implements PointTransactionRepository {
  async findByIdempotencyKey(key: string) {
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.pointTransaction.findUnique({ where: { idempotencyKey: key } });
    return row ? map(row) : null;
  }
  async create(input: PointTransactionCreateInput) {
    const { prisma } = await import("@/server/db/prisma");
    const { now, ...data } = input;
    const rows = await prisma.pointTransaction.createManyAndReturn({
      data: [{ ...data, createdAt: now }],
      skipDuplicates: true,
    });
    return map(
      rows[0] ??
        (await prisma.pointTransaction.findUniqueOrThrow({
          where: { idempotencyKey: input.idempotencyKey },
        })),
    );
  }
  async listByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.pointTransaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
    ).map(map);
  }
  async sumByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    const result = await prisma.pointTransaction.aggregate({
      where: { userId },
      _sum: { points: true, xp: true },
    });
    return { points: result._sum.points ?? 0, xp: result._sum.xp ?? 0 };
  }
}
