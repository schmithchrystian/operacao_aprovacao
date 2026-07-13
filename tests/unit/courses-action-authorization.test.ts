import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importado após o mock de "@/server/auth" (usado por `@/server/authorization`).
const { listCoursesAction, getCourseDetailAction, enrollAction } = await import(
  "@/server/actions/courses"
);

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("actions/courses — autorização e validação na fronteira (ActionResult)", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  describe("listCoursesAction", () => {
    it("retorna fail com code UNAUTHENTICATED quando não há sessão", async () => {
      authMock.mockResolvedValue(null);

      const result = await listCoursesAction();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("UNAUTHENTICATED");
      }
    });

    it("retorna ok com o catálogo do próprio usuário autenticado", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

      const result = await listCoursesAction();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.length).toBeGreaterThan(0);
      }
    });

    it("retorna fail com VALIDATION_ERROR para um `contestId` inválido (string vazia)", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

      const result = await listCoursesAction({ contestId: "" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });
  });

  describe("getCourseDetailAction", () => {
    it("retorna fail com code UNAUTHENTICATED quando não há sessão", async () => {
      authMock.mockResolvedValue(null);

      const result = await getCourseDetailAction({ slug: "pm-soldado" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("UNAUTHENTICATED");
      }
    });

    it("retorna fail com code NOT_FOUND para slug inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

      const result = await getCourseDetailAction({ slug: "curso-inexistente" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("retorna ok com o detalhe do curso do próprio usuário autenticado", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

      const result = await getCourseDetailAction({ slug: "pm-soldado" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.course.id).toBe("course-1");
      }
    });
  });

  describe("enrollAction", () => {
    it("retorna fail com code UNAUTHENTICATED quando não há sessão", async () => {
      authMock.mockResolvedValue(null);

      const result = await enrollAction({ courseId: "course-1" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("UNAUTHENTICATED");
      }
    });

    it("retorna ok e é idempotente — chamar 2x não é erro nem duplica", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-3"));

      const first = await enrollAction({ courseId: "course-2" });
      const second = await enrollAction({ courseId: "course-2" });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (first.ok && second.ok) {
        expect(second.data.enrolledAt).toBe(first.data.enrolledAt);
      }
    });
  });
});
