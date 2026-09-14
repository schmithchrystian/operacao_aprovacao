// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOGIN_RATE_LIMIT } from "@/config/business";

const testUrl = process.env.TEST_DATABASE_URL;
const prefix = `auth-test-${randomUUID()}`;
let prisma: typeof import("@/server/db/prisma").prisma;

describe.skipIf(!testUrl)("identity and atomic rate limit — isolated PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !url.pathname.toLowerCase().includes("test")
    ) {
      throw new Error("TEST_DATABASE_URL must target a local database with 'test' in its name.");
    }
    process.env.DATABASE_URL = testUrl;
    process.env.DATA_SOURCE = "prisma";
    ({ prisma } = await import("@/server/db/prisma"));
  });

  afterAll(async () => {
    if (!prisma) return;
    // Only rows owned by this unique test run are removed. Never truncate shared tables.
    await prisma.securityRateLimit.deleteMany({ where: { key: { startsWith: prefix } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.$disconnect();
  });

  it("permits exactly the configured budget under concurrent reservations and survives a reconnect", async () => {
    const { reserveLoginAttempt } =
      await import("@/server/repositories/prisma/security-rate-limit-repository");
    const key = `${prefix}-concurrent`;
    const results = await Promise.all(Array.from({ length: 20 }, () => reserveLoginAttempt(key)));
    expect(results.filter(Boolean)).toHaveLength(LOGIN_RATE_LIMIT.maxFailures);
    const record = await prisma.securityRateLimit.findUniqueOrThrow({ where: { key } });
    expect(record.count).toBe(LOGIN_RATE_LIMIT.maxFailures);
    await prisma.$disconnect();
    expect(await reserveLoginAttempt(key)).toBe(false);
    expect(
      (await prisma.securityRateLimit.findUniqueOrThrow({ where: { key } })).lockedUntil,
    ).toEqual(record.lockedUntil);
    await prisma.securityRateLimit.update({
      where: { key },
      data: { lockedUntil: new Date(Date.now() - 1000) },
    });
    expect(await reserveLoginAttempt(key)).toBe(true);
    expect((await prisma.securityRateLimit.findUniqueOrThrow({ where: { key } })).count).toBe(1);
  });

  it("does not let a stale window override an active lock", async () => {
    const { reserveLoginAttempt } =
      await import("@/server/repositories/prisma/security-rate-limit-repository");
    const key = `${prefix}-active-lock`;
    await prisma.securityRateLimit.create({
      data: { key, count: 5, windowStart: new Date(0), lockedUntil: new Date(Date.now() + 60000) },
    });
    expect(await reserveLoginAttempt(key)).toBe(false);
  });

  it("filters deleted identities and observes current role and activity in the real repository", async () => {
    const { PrismaUserRepository } = await import("@/server/repositories/prisma/user-repository");
    const repository = new PrismaUserRepository();
    const id = `${prefix}-identity`;
    const email = `${id}@example.invalid`;
    await prisma.user.create({
      data: { id, email, name: "Synthetic test", passwordHash: "not-a-login-hash", role: "ADMIN" },
    });
    expect((await repository.findById(id))?.role).toBe("admin");
    await repository.updateRole(id, "aluno");
    await repository.setActive(id, false);
    expect(await repository.findById(id)).toMatchObject({ role: "aluno", isActive: false });
    await prisma.user.update({ where: { id }, data: { isActive: true, deletedAt: new Date() } });
    expect(await repository.findById(id)).toBeNull();
    expect(await repository.findCredentialsByEmail(email)).toBeNull();
  });
});
