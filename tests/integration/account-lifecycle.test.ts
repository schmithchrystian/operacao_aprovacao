// @vitest-environment node
import { randomUUID, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { processAccountEmailQueue } from "@/server/accounts/email-worker";
import { describe, it, expect, afterAll } from "vitest";
import { createAccountService, ACCOUNT_REQUEST_MESSAGE } from "@/server/accounts/service";
import type { AccountEmail } from "@/server/accounts/email";
import { PrismaAccountRepository } from "@/server/repositories/prisma/account-repository";

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "account lifecycle on PostgreSQL with fake email delivery",
  () => {
    const prefix = "account-" + randomUUID(),
      email = prefix + "@example.invalid",
      password = "Senha inicial segura 2026!",
      messages: AccountEmail[] = [];
    let current = new Date("2026-09-14T00:00:00Z");
    const encryptionKey = Buffer.alloc(32, 7).toString("base64");
    const transport = {
      async send(message: AccountEmail) {
        messages.push(message);
      },
    };
    const service = createAccountService({
      encryptionKey,
      appUrl: "https://example.invalid",
      now: () => current,
      transport,
    });
    async function latestToken() {
      await processAccountEmailQueue({ transport, encryptionKey, now: () => current });
      const line = messages
        .at(-1)!
        .text.split("\n")
        .find((line) => line.startsWith("https://"))!;
      return new URLSearchParams(new URL(line).hash.slice(1)).get("token")!;
    }
    afterAll(async () => {
      const { prisma } = await import("@/server/db/prisma");
      const users = await prisma.user.findMany({
        where: { email: { startsWith: prefix } },
        select: { id: true },
      });
      await prisma.auditLog.deleteMany({
        where: { actorUserId: { in: users.map((user) => user.id) } },
      });
      await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
    });
    it("registers a student with hashed credentials and hashed, expiring verification token", async () => {
      expect(
        await service.register({ name: "Pessoa sintética", email, password, role: "ADMIN" }),
      ).toEqual({ message: ACCOUNT_REQUEST_MESSAGE });
      const { prisma } = await import("@/server/db/prisma");
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      expect(user).toMatchObject({
        role: "STUDENT",
        requiresEmailVerification: true,
        emailVerified: null,
        sessionVersion: 0,
      });
      expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);
      const token = await latestToken();
      const stored = await prisma.accountToken.findFirstOrThrow({ where: { userId: user.id } });
      expect(stored.hash).toBe(createHash("sha256").update(token).digest("hex"));
      expect(stored.hash).not.toBe(token);
      expect(stored.expiresAt.getTime() - current.getTime()).toBe(24 * 60 * 60_000);
      await service.verify({ token });
      await expect(service.verify({ token })).rejects.toThrow();
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified,
      ).not.toBeNull();
    });
    it("uses the same public response for existing and unknown accounts", async () => {
      const existing = await service.requestReset({ email });
      const unknown = await service.requestReset({ email: prefix + "-unknown@example.invalid" });
      expect(existing).toEqual(unknown);
      expect(existing.message).toBe(ACCOUNT_REQUEST_MESSAGE);
    });
    it("consumes a reset token exactly once under concurrent requests and revokes old sessions", async () => {
      const token = await latestToken();
      const result = await Promise.allSettled([
        service.resetPassword({ token, password: "Nova frase exclusiva 2026!" }),
        service.resetPassword({ token, password: "Outra frase exclusiva 2026!" }),
      ]);
      expect(result.filter((x) => x.status === "fulfilled")).toHaveLength(1);
      const { prisma } = await import("@/server/db/prisma");
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      expect(user.sessionVersion).toBe(1);
      expect(await bcrypt.compare(password, user.passwordHash)).toBe(false);
    });
    it("expires tokens and never reactivates a disabled account", async () => {
      await service.requestReset({ email });
      const expired = await latestToken();
      current = new Date(current.getTime() + 31 * 60_000);
      await expect(service.resetPassword({ token: expired, password })).rejects.toThrow();
      await service.requestReset({ email });
      const token = await latestToken();
      const { prisma } = await import("@/server/db/prisma");
      await prisma.user.update({ where: { email }, data: { isActive: false } });
      await expect(service.resetPassword({ token, password })).rejects.toThrow();
      expect((await prisma.user.findUniqueOrThrow({ where: { email } })).isActive).toBe(false);
    });
    it("queues delivery durably and returns no token or account identity", async () => {
      const failedEmail = prefix + "-failed@example.invalid";
      const failed = createAccountService({
        encryptionKey,
        appUrl: "https://example.invalid",
        now: () => current,
        transport: {
          async send() {
            throw new Error("synthetic delivery outage");
          },
        },
      });
      expect(await failed.register({ name: "Sintético", email: failedEmail, password })).toEqual({
        message: ACCOUNT_REQUEST_MESSAGE,
      });
      const { prisma } = await import("@/server/db/prisma");
      const token = await prisma.accountToken.findFirstOrThrow({
        where: { user: { email: failedEmail } },
      });
      expect(token.consumedAt).toBeNull();
      const queued = await prisma.accountEmailOutbox.findUniqueOrThrow({
        where: { tokenHash: token.hash },
      });
      expect(queued.status).toBe("PENDING");
      expect(queued.ciphertext).not.toContain(failedEmail);
    });
    it("reserves request budgets atomically across callers", async () => {
      const repo = new PrismaAccountRepository(),
        key = "account-test:" + prefix;
      const results = await Promise.all(
        Array.from({ length: 8 }, () => repo.reserve(key, 3, 15 * 60_000)),
      );
      expect(results.filter(Boolean)).toHaveLength(3);
      const { prisma } = await import("@/server/db/prisma");
      await prisma.securityRateLimit.delete({ where: { key } });
    });
    it("bootstraps only a new administrator on an explicitly selected database", async () => {
      const { bootstrapAdmin } = await import("../../scripts/bootstrap-admin");
      const host = new URL(process.env.TEST_DATABASE_URL!).host;
      await expect(
        bootstrapAdmin(
          { name: "Admin sintético", email: prefix + "-admin@example.invalid", password },
          "wrong-host.invalid",
        ),
      ).rejects.toThrow("target");
      const id = await bootstrapAdmin(
        { name: "Admin sintético", email: prefix + "-admin@example.invalid", password },
        host,
      );
      const { prisma } = await import("@/server/db/prisma");
      expect(await prisma.user.findUnique({ where: { id } })).toMatchObject({ role: "ADMIN" });
      await expect(
        bootstrapAdmin({ name: "Não promover", email, password }, host),
      ).rejects.toThrow();
      expect((await prisma.user.findUniqueOrThrow({ where: { email } })).role).toBe("STUDENT");
      await prisma.auditLog.deleteMany({
        where: { entityId: id, action: "accounts.bootstrap-admin" },
      });
    });
    it("binds verification to the latest registrant password instead of a pre-registration credential", async () => {
      const target = prefix + "-preregister@example.invalid",
        oldPassword = "Atacante senha sintética!",
        newPassword = "Titular senha exclusiva!";
      await service.register({ name: "Primeiro pedido", email: target, password: oldPassword });
      const oldToken = await latestToken();
      await service.register({ name: "Titular", email: target, password: newPassword });
      const newToken = await latestToken();
      await expect(service.verify({ token: oldToken })).rejects.toThrow();
      await service.verify({ token: newToken });
      const { prisma } = await import("@/server/db/prisma");
      const user = await prisma.user.findUniqueOrThrow({ where: { email: target } });
      expect(await bcrypt.compare(oldPassword, user.passwordHash)).toBe(false);
      expect(await bcrypt.compare(newPassword, user.passwordHash)).toBe(true);
    });
  },
);
