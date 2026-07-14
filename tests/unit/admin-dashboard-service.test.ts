import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

/** Testes de serviço (Fase 17 — dashboard administrativo). admin/moderador podem ver; aluno não. */

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));

const { getAdminDashboard } = await import("@/server/services/admin/dashboard-service");

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

const NOW = new Date("2026-07-14T10:00:00.000Z");

describe("services/admin/dashboard — Fase 17", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("aluno não pode ver o dashboard administrativo", async () => {
    authMock.mockResolvedValue(fakeSession("aluno", "user-1"));
    await expect(getAdminDashboard(NOW)).rejects.toThrow("Você não tem permissão");
  });

  it("moderador e admin veem o dashboard com métricas agregadas coerentes", async () => {
    authMock.mockResolvedValue(fakeSession("moderador", "user-3"));
    const dashboard = await getAdminDashboard(NOW);

    expect(dashboard.totalStudents).toBeGreaterThan(0);
    expect(dashboard.activeUsers).toBeGreaterThanOrEqual(dashboard.totalStudents);
    expect(dashboard.completionRatePercent).toBeGreaterThanOrEqual(0);
    expect(dashboard.completionRatePercent).toBeLessThanOrEqual(100);
    expect(dashboard.retentionRatePercent).toBeGreaterThanOrEqual(0);
    expect(dashboard.generatedAt).toBe(NOW.toISOString());
    // Pendência explícita documentada (sem SubscriptionRepository ainda).
    expect(dashboard.activeSubscriptions).toBe(0);
  });
});
