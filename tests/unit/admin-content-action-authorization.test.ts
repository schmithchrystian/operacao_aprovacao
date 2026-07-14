import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

/**
 * Testes de Action (fronteira `ActionResult`, docs/ARCHITECTURE.md §6) — Fase 17. Cobre os
 * requisitos explícitos: aluno/moderador recebem `FORBIDDEN` (nunca um erro cru), operação
 * destrutiva sem `confirm: true` é rejeitada com `VALIDATION_ERROR` ANTES de qualquer
 * autorização/serviço rodar, e validação Zod de entrada malformada.
 */

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));

const { createCourseForAdminAction, archiveCourseForAdminAction } = await import("@/server/actions/admin/courses");
const { createQuestionForAdminAction } = await import("@/server/actions/admin/questions");
const { changeUserRoleAction } = await import("@/server/actions/admin/users");
const { __resetMockCourseStore } = await import("@/server/repositories/mock/course-repository");

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("actions/admin — autorização e validação na fronteira (ActionResult, Fase 17)", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockCourseStore();
  });

  it("aluno recebe FORBIDDEN ao tentar criar curso (nunca um erro cru)", async () => {
    authMock.mockResolvedValue(fakeSession("aluno", "user-1"));
    const result = await createCourseForAdminAction({
      slug: "curso-x",
      title: "X",
      description: "d",
      contestId: "contest-pm-soldado",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
  });

  it("sem sessão, recebe UNAUTHENTICATED", async () => {
    authMock.mockResolvedValue(null);
    const result = await archiveCourseForAdminAction({ id: "course-1", confirm: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
  });

  it("operação destrutiva sem `confirm: true` é rejeitada com VALIDATION_ERROR (mesmo para admin)", async () => {
    authMock.mockResolvedValue(fakeSession("admin", "user-4"));

    const withoutConfirm = await archiveCourseForAdminAction({ id: "course-1" });
    expect(withoutConfirm.ok).toBe(false);
    if (!withoutConfirm.ok) expect(withoutConfirm.error.code).toBe("VALIDATION_ERROR");

    const withFalseConfirm = await archiveCourseForAdminAction({ id: "course-1", confirm: false });
    expect(withFalseConfirm.ok).toBe(false);
    if (!withFalseConfirm.ok) expect(withFalseConfirm.error.code).toBe("VALIDATION_ERROR");

    // O curso NÃO deve ter sido alterado por nenhuma das duas tentativas rejeitadas.
    const { getRepositories } = await import("@/server/repositories");
    const course = await getRepositories().courses.findById("course-1");
    expect(course?.deletedAt).toBeNull();
  });

  it("operação destrutiva COM `confirm: true` e admin é aceita", async () => {
    authMock.mockResolvedValue(fakeSession("admin", "user-4"));
    const result = await archiveCourseForAdminAction({ id: "course-1", confirm: true });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.deletedAt).not.toBeNull();
  });

  it("validação Zod rejeita questão sem alternativas suficientes", async () => {
    authMock.mockResolvedValue(fakeSession("admin", "user-4"));
    const result = await createQuestionForAdminAction({
      statement: "Enunciado",
      subjectId: "subject-matematica",
      difficulty: "EASY",
      options: [{ label: "A", text: "Única alternativa", isCorrect: true }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("alterar papel: moderador recebe FORBIDDEN (operação sensível, só admin)", async () => {
    authMock.mockResolvedValue(fakeSession("moderador", "user-3"));
    const result = await changeUserRoleAction({ userId: "user-1", role: "admin" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
  });
});
