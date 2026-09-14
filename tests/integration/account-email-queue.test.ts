// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, it, expect, afterEach, vi } from "vitest";
import { createAccountService } from "@/server/accounts/service";
import { processAccountEmailQueue } from "@/server/accounts/email-worker";
import { accountEmailKey, decryptAccountEmail } from "@/server/accounts/email-encryption";
import { PrismaAccountEmailQueueRepository } from "@/server/repositories/prisma/account-email-queue-repository";
import type { AccountEmail } from "@/server/accounts/email";

describe.skipIf(!process.env.TEST_DATABASE_URL)("durable encrypted account email queue", () => {
  const prefix = "emailqueue-" + randomUUID(),
    encryptionKey = Buffer.alloc(32, 11).toString("base64"),
    password = "Frase exclusiva de teste!";
  let current = new Date("2026-09-14T00:00:00Z");
  const send = vi.fn<(message: AccountEmail) => Promise<void>>().mockResolvedValue(undefined),
    transport = { send };
  const service = createAccountService({
    transport,
    encryptionKey,
    appUrl: "https://example.invalid",
    now: () => current,
  });
  async function register() {
    const email = prefix + randomUUID() + "@example.invalid";
    await service.register({ name: "Sintético", email, password });
    const { prisma } = await import("@/server/db/prisma");
    const row = await prisma.accountEmailOutbox.findFirstOrThrow({
      where: { token: { user: { email } } },
    });
    return { email, row };
  }
  afterEach(async () => {
    const { prisma } = await import("@/server/db/prisma");
    const ids = (
      await prisma.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true } })
    ).map((x) => x.id);
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    send.mockReset().mockResolvedValue(undefined);
    current = new Date("2026-09-14T00:00:00Z");
  });
  it("enqueues atomically without calling the email provider and clears sensitive payload on success", async () => {
    const { email, row } = await register();
    expect(send).not.toHaveBeenCalled();
    expect(row.ciphertext).not.toContain(email);
    const message = decryptAccountEmail(
      row.ciphertext!,
      accountEmailKey(encryptionKey),
      row.id,
      row.expiresAt,
    );
    expect(message.to).toBe(email);
    expect(row.ciphertext).not.toContain(message.text);
    const result = await processAccountEmailQueue({ transport, encryptionKey, now: () => current });
    expect(result.processed).toBe(1);
    expect(send).toHaveBeenCalledOnce();
    const { prisma } = await import("@/server/db/prisma");
    expect(await prisma.accountEmailOutbox.findUnique({ where: { id: row.id } })).toMatchObject({
      status: "PROCESSED",
      ciphertext: null,
      leaseToken: null,
    });
  });
  it("claims once across concurrent workers and recovers a crashed lease", async () => {
    const { row } = await register();
    const repo = new PrismaAccountEmailQueueRepository();
    const claims = await Promise.all([repo.claim(current, 1), repo.claim(current, 1)]);
    expect(claims.flat()).toHaveLength(1);
    expect(
      (await processAccountEmailQueue({ transport, encryptionKey, now: () => current })).claimed,
    ).toBe(0);
    current = new Date(current.getTime() + 121_000);
    await processAccountEmailQueue({ transport, encryptionKey, now: () => current });
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]![0].idempotencyKey).toBe(row.tokenHash);
  });
  it("retries delivery with the same idempotency key, then removes encrypted payload", async () => {
    const { row } = await register();
    send.mockRejectedValueOnce(new Error("synthetic outage"));
    expect(
      (await processAccountEmailQueue({ transport, encryptionKey, now: () => current })).retrying,
    ).toBe(1);
    const { prisma } = await import("@/server/db/prisma");
    const pending = await prisma.accountEmailOutbox.findUniqueOrThrow({ where: { id: row.id } });
    expect(pending.ciphertext).not.toBeNull();
    expect(pending.lastErrorCode).toBe("DELIVERY_FAILED");
    current = pending.availableAt;
    await processAccountEmailQueue({ transport, encryptionKey, now: () => current });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]![0]).toEqual(send.mock.calls[1]![0]);
    expect(
      (await prisma.accountEmailOutbox.findUniqueOrThrow({ where: { id: row.id } })).ciphertext,
    ).toBeNull();
  });
  it("never sends an expired or invalidated token", async () => {
    const { row } = await register();
    current = new Date(row.expiresAt.getTime() + 1);
    expect(
      (await processAccountEmailQueue({ transport, encryptionKey, now: () => current })).skipped,
    ).toBe(1);
    expect(send).not.toHaveBeenCalled();
    const { prisma } = await import("@/server/db/prisma");
    expect(
      (await prisma.accountEmailOutbox.findUniqueOrThrow({ where: { id: row.id } })).ciphertext,
    ).toBeNull();
  });
  it("fails closed on ciphertext tampering and revokes the corresponding token", async () => {
    const { row } = await register();
    const { prisma } = await import("@/server/db/prisma");
    await prisma.accountEmailOutbox.update({
      where: { id: row.id },
      data: { ciphertext: "v1.invalid.invalid.invalid" },
    });
    expect(
      (await processAccountEmailQueue({ transport, encryptionKey, now: () => current })).failed,
    ).toBe(1);
    expect(send).not.toHaveBeenCalled();
    expect(
      (await prisma.accountToken.findUniqueOrThrow({ where: { hash: row.tokenHash } })).consumedAt,
    ).not.toBeNull();
  });
  it("bounds retries and expires the token after terminal delivery failure", async () => {
    const { row } = await register();
    send.mockRejectedValue(new Error("synthetic outage"));
    const { prisma } = await import("@/server/db/prisma");
    for (let i = 0; i < 5; i++) {
      await processAccountEmailQueue({ transport, encryptionKey, now: () => current });
      current = (await prisma.accountEmailOutbox.findUniqueOrThrow({ where: { id: row.id } }))
        .availableAt;
    }
    expect(send).toHaveBeenCalledTimes(5);
    expect(await prisma.accountEmailOutbox.findUnique({ where: { id: row.id } })).toMatchObject({
      status: "FAILED",
      ciphertext: null,
    });
    expect(
      (await prisma.accountToken.findUniqueOrThrow({ where: { hash: row.tokenHash } })).consumedAt,
    ).not.toBeNull();
  });
});
