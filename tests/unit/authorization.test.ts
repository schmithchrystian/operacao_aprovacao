import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importado após o mock de "@/server/auth" (usado internamente por este módulo).
const { getCurrentSession, requireUser, requireRole, assertOwnership } =
  await import("@/server/authorization");
const { AuthError, ForbiddenError } = await import("@/server/errors");

function fakeNextAuthSession(overrides: Partial<NextAuthSession["user"]> = {}): NextAuthSession {
  return {
    user: {
      id: "user-1",
      role: "aluno",
      name: "Ana Recruta",
      email: "ana.recruta@example.com",
      ...overrides,
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("authorization — sessão inexistente", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("getCurrentSession retorna null quando não há sessão do Auth.js", async () => {
    authMock.mockResolvedValueOnce(null);

    await expect(getCurrentSession()).resolves.toBeNull();
  });

  it("requireUser lança AuthError quando não há sessão", async () => {
    authMock.mockResolvedValueOnce(null);

    await expect(requireUser()).rejects.toBeInstanceOf(AuthError);
  });

  it("requireRole lança AuthError (não ForbiddenError) quando não há sessão", async () => {
    authMock.mockResolvedValueOnce(null);

    await expect(requireRole("admin")).rejects.toBeInstanceOf(AuthError);
  });
});

describe("authorization — RBAC (requireRole)", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("um usuário 'aluno' NÃO pode acessar um recurso que exige 'admin'/'moderador' (ForbiddenError)", async () => {
    authMock.mockResolvedValueOnce(fakeNextAuthSession({ role: "aluno" }));

    await expect(requireRole("admin", "moderador")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("um usuário 'admin' acessa normalmente um recurso que exige 'admin'/'moderador'", async () => {
    authMock.mockResolvedValueOnce(fakeNextAuthSession({ role: "admin", id: "user-4" }));

    const session = await requireRole("admin", "moderador");

    expect(session.role).toBe("admin");
    expect(session.userId).toBe("user-4");
  });
});

describe("authorization — assertOwnership (anti-IDOR)", () => {
  it("rejeita quando o dado pertence a outro usuário", () => {
    expect(() => assertOwnership("user-2", "user-1")).toThrow(ForbiddenError);
  });

  it("permite quando o dado pertence ao próprio usuário autenticado", () => {
    expect(() => assertOwnership("user-1", "user-1")).not.toThrow();
  });
});

describe("authorization — live identity revocation", () => {
  it("rejects an old version after password reset and accepts the matching new version", async () => {
    const { getRepositories } = await import("@/server/repositories");
    const user = await getRepositories().users.findById("user-1");
    const spy = vi
      .spyOn(getRepositories().users, "findById")
      .mockResolvedValue({ ...user!, sessionVersion: 2 });
    try {
      authMock.mockResolvedValue(fakeNextAuthSession({ id: "user-1", sessionVersion: 1 }));
      await expect(requireUser()).rejects.toBeInstanceOf(AuthError);
      authMock.mockResolvedValue(fakeNextAuthSession({ id: "user-1", sessionVersion: 2 }));
      await expect(requireUser()).resolves.toMatchObject({ userId: "user-1" });
    } finally {
      spy.mockRestore();
    }
  });
  it("ignores stale administrator claims after demotion", async () => {
    authMock.mockResolvedValue(fakeNextAuthSession({ role: "admin", id: "user-1" }));
    await expect(requireRole("admin")).rejects.toBeInstanceOf(ForbiddenError);
  });
  it("rejects sessions after account deactivation and recovers only after reactivation", async () => {
    const { getRepositories } = await import("@/server/repositories");
    const users = getRepositories().users;
    authMock.mockResolvedValue(fakeNextAuthSession({ id: "user-4", role: "admin" }));
    await users.setActive("user-4", false);
    try {
      await expect(requireUser()).rejects.toBeInstanceOf(AuthError);
    } finally {
      await users.setActive("user-4", true);
    }
  });
  it("rejects an otherwise valid session for a missing identity", async () => {
    authMock.mockResolvedValue(fakeNextAuthSession({ id: "nonexistent", role: "admin" }));
    await expect(requireUser()).rejects.toBeInstanceOf(AuthError);
  });
});
