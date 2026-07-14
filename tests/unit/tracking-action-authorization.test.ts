import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importado após o mock de "@/server/auth" (usado por `@/server/authorization`).
const { getTrackingOverviewAction, getDiagnosisAction } = await import("@/server/actions/tracking");
const { __resetMockStudySessionStore } = await import("@/server/repositories/mock/study-session-repository");
const { __resetMockUserStreakStore } = await import("@/server/repositories/mock/user-streak-repository");
const { __resetMockDailyGoalStore } = await import("@/server/repositories/mock/daily-goal-repository");
const { __resetMockWeeklyGoalStore } = await import("@/server/repositories/mock/weekly-goal-repository");

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

/**
 * Testes de autorização na fronteira das Server Actions de acompanhamento/diagnóstico
 * (Fase 12 — CLAUDE.md §11/§24/§25): sem sessão, a fronteira devolve `ActionResult` com
 * `ok:false`/`UNAUTHENTICATED` — nunca deixa o erro de domínio propagar cru para a UI, e nunca
 * aceita `userId` do corpo da requisição (sempre resolvido da sessão real).
 */
describe("actions/tracking — autorização na fronteira (ActionResult)", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockStudySessionStore();
    __resetMockUserStreakStore();
    __resetMockDailyGoalStore();
    __resetMockWeeklyGoalStore();
  });

  it("getTrackingOverviewAction retorna fail com code UNAUTHENTICATED quando não há sessão", async () => {
    authMock.mockResolvedValue(null);

    const result = await getTrackingOverviewAction();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("getDiagnosisAction retorna fail com code UNAUTHENTICATED quando não há sessão", async () => {
    authMock.mockResolvedValue(null);

    const result = await getDiagnosisAction();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("getTrackingOverviewAction retorna ok com o acompanhamento do próprio usuário autenticado", async () => {
    authMock.mockResolvedValue(fakeSession("aluno", "tracking-auth-user"));

    const result = await getTrackingOverviewAction();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.hours.todayMinutes).toBeGreaterThanOrEqual(0);
      expect(result.data.streak.currentStreak).toBeGreaterThanOrEqual(0);
      expect(result.data.weeklyEvolution).toHaveLength(8);
      expect(result.data.monthlyEvolution).toHaveLength(6);
    }
  });

  it("getDiagnosisAction retorna ok com um diagnóstico coerente para o usuário autenticado", async () => {
    authMock.mockResolvedValue(fakeSession("aluno", "diagnosis-auth-user"));

    const result = await getDiagnosisAction();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(result.data.delayRisk);
      expect(result.data.strengths.length).toBeGreaterThan(0);
      expect(result.data.weaknesses.length).toBeGreaterThan(0);
    }
  });
});
