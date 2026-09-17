import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importado após o mock de "@/server/auth" (usado por `@/server/authorization`).
const { getStudentDashboard } = await import("@/server/services/dashboard-service");

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("getStudentDashboard — agregação e autorização", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("agrega corretamente o dashboard de um aluno mock (user-1)", async () => {
    authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

    const dashboard = await getStudentDashboard("user-1");

    expect(dashboard.identity.studentName).toBe("Ana Recruta");
    expect(dashboard.identity.selectedContestId).toBe("contest-pm-soldado");
    expect(dashboard.gamification.level.name).toBe("Aspirante");
    expect(dashboard.study.lessonsCompleted).toBeGreaterThan(0);
    expect(dashboard.ranking?.position).toBeGreaterThan(0);
    expect(dashboard.studyHoursSeries).toHaveLength(7);
    expect(dashboard.recentAchievements.length).toBeGreaterThan(0);
    expect(dashboard.nextLesson).not.toBeNull();
    // `courseTitle` deve vir do CourseRepository (não duplicado no mock de próxima aula).
    expect(dashboard.nextLesson?.courseTitle).toBe("Polícia Militar — Soldado");
  });

  it("XP do próximo nível é maior que o XP do nível atual quando existir próximo nível", async () => {
    authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

    const dashboard = await getStudentDashboard("user-1");

    expect(dashboard.gamification.nextLevelXp).not.toBeNull();
    if (dashboard.gamification.nextLevelXp !== null) {
      expect(dashboard.gamification.nextLevelXp).toBeGreaterThan(
        dashboard.gamification.currentLevelXp,
      );
    }
  });

  it("nível máximo (Comandante) não possui próximo nível (nextLevelXp null)", async () => {
    authMock.mockResolvedValue(fakeSession("admin", "user-4"));

    const dashboard = await getStudentDashboard("user-4");

    expect(dashboard.gamification.level.name).toBe("Comandante");
    expect(dashboard.gamification.nextLevelXp).toBeNull();
  });

  it("lança erro quando não há sessão (fronteira exige autenticação)", async () => {
    authMock.mockResolvedValue(null);

    await expect(getStudentDashboard("user-1")).rejects.toThrow();
  });

  it("lança erro quando o usuário autenticado tenta ler o dashboard de outro aluno (anti-IDOR)", async () => {
    authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

    await expect(getStudentDashboard("user-4")).rejects.toThrow();
  });
});
