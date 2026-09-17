// @vitest-environment node
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaAccountRepository } from "@/server/repositories/prisma/account-repository";
const prefix = `identity-review-${randomUUID()}`;
const userId = prefix;
const email = `${prefix}@example.invalid`;
const repo = new PrismaAccountRepository();
let prisma: typeof import("@/server/db/prisma").prisma;
describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "independent legacy account verification boundary",
  () => {
    beforeAll(async () => {
      const url = new URL(process.env.TEST_DATABASE_URL!);
      if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.includes("test"))
        throw new Error("Isolated local test database required");
      ({ prisma } = await import("@/server/db/prisma"));
      await prisma.user.create({
        data: {
          id: userId,
          email,
          name: "Existing account",
          passwordHash: "original-existing-password-hash",
          requiresEmailVerification: false,
        },
      });
    });
    afterAll(async () => {
      if (prisma) {
        await prisma.user.deleteMany({ where: { id: userId } });
        await prisma.$disconnect();
      }
    });
    it("does not issue verification credentials for an existing account outside the verification flow", async () => {
      const now = new Date(),
        expiresAt = new Date(now.getTime() + 60000);
      await repo.prepare({
        email,
        name: "New registration attempt",
        passwordHash: "different-proposed-hash",
        purpose: "VERIFY_EMAIL",
        hash: `${prefix}-issued`,
        now,
        expiresAt,
        emailQueue: { id: `${prefix}-queue`, ciphertext: "synthetic-unused", expiresAt },
      });
      expect(await prisma.accountToken.count({ where: { userId } })).toBe(0);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash).toBe(
        "original-existing-password-hash",
      );
    });
    it("rejects even an already-issued verification token if the account is not enrolled in verification", async () => {
      const hash = `${prefix}-legacy-token`,
        now = new Date();
      await prisma.accountToken.create({
        data: {
          userId,
          hash,
          purpose: "VERIFY_EMAIL",
          proposedPasswordHash: "different-proposed-hash",
          expiresAt: new Date(now.getTime() + 60000),
        },
      });
      await expect(repo.consume({ hash, purpose: "VERIFY_EMAIL", now })).rejects.toThrow();
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash).toBe(
        "original-existing-password-hash",
      );
    });
  },
);
