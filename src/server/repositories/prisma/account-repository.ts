import type { AccountTokenPurpose } from "@/generated/prisma/client";
import { inRepositoryTransaction } from "@/server/repositories/transaction";
export class InvalidAccountTokenError extends Error {}
export class PrismaAccountRepository {
  async reserve(key: string, max: number, windowMs: number): Promise<boolean> {
    const { prisma } = await import("@/server/db/prisma");
    const rows = await prisma.$queryRaw<
      Array<{ count: number }>
    >`INSERT INTO "SecurityRateLimit" ("key","count","windowStart") VALUES (${key},1,clock_timestamp() AT TIME ZONE 'UTC') ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "SecurityRateLimit"."windowStart" <= (clock_timestamp() AT TIME ZONE 'UTC')-${windowMs}*interval '1 millisecond' THEN 1 ELSE "SecurityRateLimit"."count"+1 END,"windowStart"=CASE WHEN "SecurityRateLimit"."windowStart" <= (clock_timestamp() AT TIME ZONE 'UTC')-${windowMs}*interval '1 millisecond' THEN EXCLUDED."windowStart" ELSE "SecurityRateLimit"."windowStart" END WHERE "SecurityRateLimit"."count"<${max} OR "SecurityRateLimit"."windowStart" <= (clock_timestamp() AT TIME ZONE 'UTC')-${windowMs}*interval '1 millisecond' RETURNING "count"`;
    return rows.length === 1;
  }
  async prepare(input: {
    email: string;
    name?: string;
    passwordHash?: string;
    purpose: AccountTokenPurpose;
    hash: string;
    now: Date;
    expiresAt: Date;
    emailQueue: { id: string; ciphertext: string; expiresAt: Date };
  }) {
    const { prisma } = await import("@/server/db/prisma");
    return inRepositoryTransaction(async () => {
      if (input.name && input.passwordHash) {
        await prisma.$executeRaw`INSERT INTO "User" ("id","name","email","passwordHash","role","requiresEmailVerification","updatedAt") VALUES (${crypto.randomUUID()},${input.name},${input.email},${input.passwordHash},'STUDENT',true,${input.now}) ON CONFLICT ("email") DO NOTHING`;
      }
      await prisma.$queryRaw`SELECT "id" FROM "User" WHERE "email"=${input.email} FOR UPDATE`;
      const user = await prisma.user.findUnique({ where: { email: input.email } });
      if (!user || !user.isActive || user.deletedAt) return null;
      if (
        input.purpose === "VERIFY_EMAIL" &&
        (user.emailVerified || !user.requiresEmailVerification)
      )
        return null;
      if (
        input.purpose === "RESET_PASSWORD" &&
        user.requiresEmailVerification &&
        !user.emailVerified
      )
        return null;
      await prisma.accountToken.updateMany({
        where: { userId: user.id, purpose: input.purpose, consumedAt: null },
        data: { consumedAt: input.now },
      });
      await prisma.accountToken.create({
        data: {
          userId: user.id,
          hash: input.hash,
          purpose: input.purpose,
          proposedPasswordHash: input.purpose === "VERIFY_EMAIL" ? input.passwordHash : null,
          expiresAt: input.expiresAt,
          createdAt: input.now,
        },
      });
      await prisma.accountEmailOutbox.create({
        data: {
          id: input.emailQueue.id,
          tokenHash: input.hash,
          ciphertext: input.emailQueue.ciphertext,
          expiresAt: input.emailQueue.expiresAt,
          availableAt: input.now,
          createdAt: input.now,
        },
      });
      return { id: user.id, email: user.email };
    });
  }
  async invalidate(hash: string, now: Date) {
    const { prisma } = await import("@/server/db/prisma");
    await prisma.accountToken.updateMany({
      where: { hash, consumedAt: null },
      data: { consumedAt: now },
    });
  }
  async consume(input: {
    hash: string;
    purpose: AccountTokenPurpose;
    now: Date;
    passwordHash?: string;
  }) {
    const { prisma } = await import("@/server/db/prisma");
    return inRepositoryTransaction(async () => {
      await prisma.$queryRaw`SELECT "id" FROM "AccountToken" WHERE "hash"=${input.hash} FOR UPDATE`;
      const token = await prisma.accountToken.findUnique({ where: { hash: input.hash } });
      if (
        !token ||
        token.purpose !== input.purpose ||
        token.consumedAt ||
        token.expiresAt <= input.now
      )
        throw new InvalidAccountTokenError();
      if (input.purpose === "VERIFY_EMAIL" && !token.proposedPasswordHash)
        throw new InvalidAccountTokenError();
      const data =
        input.purpose === "VERIFY_EMAIL"
          ? { emailVerified: input.now, passwordHash: token.proposedPasswordHash! }
          : { passwordHash: input.passwordHash!, sessionVersion: { increment: 1 } };
      const changed = await prisma.user.updateMany({
        where: {
          id: token.userId,
          isActive: true,
          deletedAt: null,
          ...(input.purpose === "VERIFY_EMAIL"
            ? { emailVerified: null, requiresEmailVerification: true }
            : {}),
        },
        data,
      });
      if (changed.count !== 1) throw new InvalidAccountTokenError();
      await prisma.accountToken.updateMany({
        where: { userId: token.userId, purpose: input.purpose, consumedAt: null },
        data: { consumedAt: input.now },
      });
      return token.userId;
    });
  }
}
