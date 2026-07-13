import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importado após o mock de "@/server/auth" (usado por `@/server/authorization`).
const { listUsersForAdminAction } = await import("@/server/actions/admin/list-users");

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("listUsersForAdminAction — autorização na fronteira (ActionResult)", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("retorna fail com code FORBIDDEN para um usuário aluno (não propaga erro cru)", async () => {
    authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

    const result = await listUsersForAdminAction();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("retorna fail com code UNAUTHENTICATED quando não há sessão", async () => {
    authMock.mockResolvedValue(null);

    const result = await listUsersForAdminAction();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("retorna ok com a lista de usuários para um admin", async () => {
    authMock.mockResolvedValue(fakeSession("admin", "user-4"));

    const result = await listUsersForAdminAction();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    }
  });
});
