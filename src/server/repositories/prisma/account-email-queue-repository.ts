import { randomUUID } from "node:crypto";
import type { AccountEmailOutbox as Row } from "@/generated/prisma/client";
import { inRepositoryTransaction } from "@/server/repositories/transaction";
export class PrismaAccountEmailQueueRepository {
  async cleanup(now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    const expired = await prisma.accountEmailOutbox.updateMany({
      where: {
        status: "PENDING",
        OR: [
          { expiresAt: { lte: now } },
          { token: { consumedAt: { not: null } } },
          { token: { user: { isActive: false } } },
          { token: { user: { deletedAt: { not: null } } } },
        ],
      },
      data: {
        status: "SKIPPED",
        ciphertext: null,
        leaseUntil: null,
        leaseToken: null,
        processedAt: now,
        lastErrorCode: "INELIGIBLE_OR_EXPIRED",
      },
    });
    await prisma.accountEmailOutbox.deleteMany({
      where: {
        status: { not: "PENDING" },
        expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60_000) },
      },
    });
    return expired.count;
  }
  async claim(now: Date, limit: number) {
    const { prisma } = await import("@/server/db/prisma");
    const leaseToken = randomUUID(),
      leaseUntil = new Date(now.getTime() + 120_000);
    return prisma.$queryRaw<
      Row[]
    >`WITH picked AS (SELECT "id" FROM "AccountEmailOutbox" WHERE "status"='PENDING' AND "availableAt"<=${now} AND "expiresAt">${now} AND ("leaseUntil" IS NULL OR "leaseUntil"<=${now}) ORDER BY "availableAt","createdAt" LIMIT ${limit} FOR UPDATE SKIP LOCKED) UPDATE "AccountEmailOutbox" AS q SET "leaseToken"=${leaseToken},"leaseUntil"=${leaseUntil},"attempts"=q."attempts"+1 FROM picked WHERE q."id"=picked."id" RETURNING q.*`;
  }
  async eligible(id: string, leaseToken: string, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      (await prisma.accountEmailOutbox.count({
        where: {
          id,
          leaseToken,
          status: "PENDING",
          expiresAt: { gt: now },
          token: {
            consumedAt: null,
            expiresAt: { gt: now },
            user: { isActive: true, deletedAt: null },
          },
        },
      })) === 1
    );
  }
  async complete(
    row: Row,
    status: "PROCESSED" | "FAILED" | "SKIPPED",
    now: Date,
    errorCode: string | null = null,
  ) {
    const { prisma } = await import("@/server/db/prisma");
    return inRepositoryTransaction(async () => {
      const result = await prisma.accountEmailOutbox.updateMany({
        where: { id: row.id, leaseToken: row.leaseToken, status: "PENDING" },
        data: {
          status,
          ciphertext: null,
          processedAt: now,
          lastErrorCode: errorCode,
          leaseUntil: null,
          leaseToken: null,
        },
      });
      if (result.count && status === "FAILED")
        await prisma.accountToken.updateMany({
          where: { hash: row.tokenHash, consumedAt: null },
          data: { consumedAt: now },
        });
      return result.count === 1;
    });
  }
  async retry(row: Row, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    const availableAt = new Date(
      now.getTime() + Math.min(30_000 * 2 ** Math.min(row.attempts, 5), 15 * 60_000),
    );
    if (row.attempts >= 5 || availableAt >= row.expiresAt)
      return this.complete(row, "FAILED", now, "DELIVERY_RETRIES_EXHAUSTED");
    await prisma.accountEmailOutbox.updateMany({
      where: { id: row.id, leaseToken: row.leaseToken, status: "PENDING" },
      data: { availableAt, leaseUntil: null, leaseToken: null, lastErrorCode: "DELIVERY_FAILED" },
    });
    return false;
  }
}
