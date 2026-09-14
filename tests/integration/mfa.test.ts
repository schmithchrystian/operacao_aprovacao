import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
vi.mock("@/server/authorization", () => ({ requireUser: vi.fn() }));
import { verifyCredentials } from "@/server/auth/credentials-service";
import { env } from "@/config/env";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/authorization";
import { beginMfa, manageMfa, confirmMfa, consumeMfa } from "@/server/auth/mfa/service";
import { encryptSecret, recoveryHash, totp } from "@/server/auth/mfa/crypto";
const id = `mfa-test-${randomUUID()}`;
const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const recovery = "ab".repeat(16);
describe("MFA PostgreSQL atomic consumption", () => {
  beforeAll(async () => {
    env.MFA_ENCRYPTION_KEY = "ab".repeat(32);
    await prisma.user.create({
      data: { id, name: "MFA test", email: `${id}@example.test`, passwordHash: "unused" },
    });
    await prisma.userMfa.create({
      data: {
        userId: id,
        encryptedSecret: encryptSecret(secret, env.MFA_ENCRYPTION_KEY, id),
        enabledAt: new Date(),
        expiresAt: new Date(),
        recoveryHashes: [recoveryHash(recovery)],
      },
    });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id } });
  });
  it("accepts one concurrent OTP and rejects replay", async () => {
    const code = totp(secret, Math.floor(Date.now() / 30000));
    const results = await Promise.all(Array.from({ length: 8 }, () => consumeMfa(id, code)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await consumeMfa(id, code)).toBe(false);
  });
  it("consumes recovery once across workers", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => consumeMfa(id, recovery)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await consumeMfa(id, recovery)).toBe(false);
  });
  it("confirmation activates factor and invalidates existing sessions", async () => {
    await prisma.userMfa.update({
      where: { userId: id },
      data: { enabledAt: null, expiresAt: new Date(Date.now() + 600000), lastStep: -1 },
    });
    vi.mocked(requireUser).mockResolvedValue({
      userId: id,
      role: "admin",
      name: "MFA",
      email: `${id}@example.test`,
    });
    const codes = await confirmMfa(totp(secret, Math.floor(Date.now() / 30000)));
    expect(codes).toHaveLength(10);
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).sessionVersion).toBe(1);
    const record = await prisma.userMfa.findUniqueOrThrow({ where: { userId: id } });
    expect(record.enabledAt).not.toBeNull();
    expect(record.recoveryHashes).not.toContain(codes[0]);
  });
  it("rejects malformed and unknown factors", async () => {
    expect(await consumeMfa(id, "invalid")).toBe(false);
    expect(await consumeMfa(id, "cd".repeat(16))).toBe(false);
  });
  it("rejects setup with an incorrect password", async () => {
    await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash("correct-password", 4) },
    });
    await expect(beginMfa("wrong-password")).rejects.toThrow();
  });
  it("requires password plus factor to regenerate and revokes sessions", async () => {
    const code = "ef".repeat(16);
    await prisma.userMfa.update({
      where: { userId: id },
      data: { recoveryHashes: [recoveryHash(code)] },
    });
    const codes = await manageMfa("correct-password", code, false);
    expect(codes).toHaveLength(10);
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).sessionVersion).toBe(2);
    expect(await consumeMfa(id, code)).toBe(false);
  });
  it("mandatory policy prevents disabling even with valid factor", async () => {
    await prisma.securityRateLimit.deleteMany({where:{key:`interval:${createHash("sha256").update(`mfa-manage:${id}`).digest("hex")}`}});
    env.ADMIN_MFA_REQUIRED = true;
    await expect(manageMfa("correct-password", "ab".repeat(16), true)).rejects.toThrow();
    expect(
      (await prisma.userMfa.findUniqueOrThrow({ where: { userId: id } })).enabledAt,
    ).not.toBeNull();
    env.ADMIN_MFA_REQUIRED = false;
  });

  it("password alone cannot log in after enrollment", async () => {
    expect(await verifyCredentials(`${id}@example.test`, "correct-password")).toBeNull();
  });
});
