import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importado após o mock de "@/server/auth" (usado por `@/server/authorization`).
const { getDashboardAction } = await import("@/server/actions/dashboard");

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("getDashboardAction — autorização na fronteira (ActionResult)", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("retorna fail com code UNAUTHENTICATED quando não há sessão", async () => {
    authMock.mockResolvedValue(null);

    const result = await getDashboardAction();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("retorna ok com o DashboardDTO do próprio usuário autenticado", async () => {
    authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

    const result = await getDashboardAction();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.identity.studentName).toBe("Ana Recruta");
      expect(result.data.gamification.xp).toBeGreaterThanOrEqual(0);
    }
  });
});
