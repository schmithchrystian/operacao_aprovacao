import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOGIN_RATE_LIMIT } from "@/config/business";
import { __resetRateLimitStore } from "@/server/auth/rate-limit";
import { getAuditRecords } from "@/server/audit/log";

const { compare, findCredentialsByEmail, signIn } = vi.hoisted(() => ({
  compare: vi.fn(),
  findCredentialsByEmail: vi.fn(),
  signIn: vi.fn(),
}));
vi.mock("bcryptjs", () => ({ default: { compare } }));
vi.mock("@/server/repositories", () => ({
  getRepositories: () => ({ users: { findCredentialsByEmail } }),
}));
vi.mock("@/server/auth", () => ({ signIn, signOut: vi.fn() }));
const { authConfig } = await import("@/server/auth/config");
const { verifyCredentials } = await import("@/server/auth/credentials-service");
const { loginAction } = await import("@/server/actions/auth");
// Credentials() stores the configured authorize function in options.
const provider = authConfig.providers[0] as unknown as {
  options: { authorize: (credentials: unknown) => Promise<unknown> };
};
const authorize = provider.options.authorize;

describe("shared Credentials security boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimitStore();
    compare.mockResolvedValue(false);
    findCredentialsByEmail.mockResolvedValue({
      id: "test-user",
      email: "test@example.com",
      name: "Test",
      role: "admin",
      isActive: true,
      passwordHash: "hash",
    });
  });

  it("reserves the budget before bcrypt even for parallel direct provider calls", async () => {
    const attempts = Array.from({ length: 20 }, () =>
      authorize({ email: "test@example.com", password: "wrong-password" }),
    );
    await Promise.all(attempts);
    expect(compare).toHaveBeenCalledTimes(LOGIN_RATE_LIMIT.maxFailures);
    compare.mockResolvedValue(true);
    await expect(
      authorize({ email: "TEST@example.com", password: "correct-password" }),
    ).resolves.toBeNull();
    expect(compare).toHaveBeenCalledTimes(LOGIN_RATE_LIMIT.maxFailures);
    expect(getAuditRecords().some((entry) => entry.operation === "auth.login.blocked")).toBe(true);
  });

  it("the form reaches exactly one password check through the same provider", async () => {
    compare.mockResolvedValue(true);
    signIn.mockImplementation(async (_provider, credentials) => authorize(credentials));
    await loginAction({ email: "test@example.com", password: "correct-password" });
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(compare).toHaveBeenCalledTimes(1);
  });

  it("rejects logically deleted credentials even if the repository returns them", async () => {
    findCredentialsByEmail.mockResolvedValue({
      id: "deleted",
      isActive: true,
      deletedAt: "2026-01-01T00:00:00Z",
      passwordHash: "hash",
    });
    compare.mockResolvedValue(true);
    await expect(verifyCredentials("test@example.com", "correct-password")).resolves.toBeNull();
  });

  it("requires verified email only for accounts enrolled in the verification flow", async () => {
    compare.mockResolvedValue(true);
    findCredentialsByEmail.mockResolvedValue({
      id: "new",
      isActive: true,
      requiresEmailVerification: true,
      emailVerified: null,
      passwordHash: "hash",
    });
    await expect(verifyCredentials("test@example.com", "correct-password")).resolves.toBeNull();
    findCredentialsByEmail.mockResolvedValue({
      id: "new",
      isActive: true,
      requiresEmailVerification: true,
      emailVerified: "2026-09-14T00:00:00Z",
      sessionVersion: 2,
      passwordHash: "hash",
    });
    await expect(verifyCredentials("test@example.com", "correct-password")).resolves.toMatchObject({
      sessionVersion: 2,
    });
  });
});
