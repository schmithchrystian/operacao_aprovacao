import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por `@/server/authorization`).
const { listCourses, getCourseDetail, enroll, getResumePoint } = await import(
  "@/server/services/courses"
);
const { getRepositories } = await import("@/server/repositories");

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("services/courses — Fase 6", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  describe("listCourses", () => {
    it("lista os 3 cursos do catálogo com matrícula/progresso do usuário anexados", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

      const courses = await listCourses("user-1");

      expect(courses).toHaveLength(3);
      const enrolledCourse = courses.find((course) => course.id === "course-1");
      expect(enrolledCourse?.enrolled).toBe(true);
      expect(enrolledCourse?.status).toBe("em_andamento");
      expect(enrolledCourse?.progressPercent).toBeGreaterThan(0);
      expect(enrolledCourse?.progressPercent).toBeLessThan(100);
      expect(enrolledCourse?.subjects).toContain("Língua Portuguesa");
      expect(enrolledCourse?.subjects).toContain("Raciocínio Lógico");

      const notEnrolledCourse = courses.find((course) => course.id === "course-3");
      expect(notEnrolledCourse?.enrolled).toBe(false);
      expect(notEnrolledCourse?.progressPercent).toBe(0);
      expect(notEnrolledCourse?.status).toBe("nao_iniciado");
    });

    it("filtra por concurso quando `contestId` é informado", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-2"));

      const courses = await listCourses("user-2", { contestId: "contest-gcm-agente" });

      expect(courses).toHaveLength(1);
      expect(courses[0]?.id).toBe("course-2");
    });

    it("lança erro ao tentar listar cursos de outro usuário (anti-IDOR)", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

      await expect(listCourses("user-4")).rejects.toThrow();
    });

    it("lança erro quando não há sessão autenticada", async () => {
      authMock.mockResolvedValue(null);

      await expect(listCourses("user-1")).rejects.toThrow();
    });
  });

  describe("getCourseDetail", () => {
    it("computa liberação sequencial e retomada corretas para user-1 em pm-soldado", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

      const detail = await getCourseDetail("user-1", "pm-soldado");

      const [moduleLinguaPortuguesa, moduleRaciocinioLogico, moduleDireitoConstitucional] =
        detail.modules;

      // Módulo 1 (Língua Portuguesa): as 4 aulas concluídas na Fase 6 mock.
      expect(moduleLinguaPortuguesa?.status).toBe("completed");
      expect(moduleLinguaPortuguesa?.progressPercent).toBe(100);
      expect(moduleLinguaPortuguesa?.lessons.every((lesson) => lesson.status === "completed")).toBe(
        true,
      );

      // Módulo 2 (Raciocínio Lógico): 1ª aula concluída, 2ª em andamento, resto bloqueado.
      expect(moduleRaciocinioLogico?.lessons[0]?.status).toBe("completed");
      expect(moduleRaciocinioLogico?.lessons[1]?.status).toBe("in_progress");
      expect(moduleRaciocinioLogico?.lessons[2]?.status).toBe("locked");
      expect(moduleRaciocinioLogico?.lessons[3]?.status).toBe("locked");

      // Módulo 3 (Direito Constitucional): inteiramente bloqueado (módulo 2 não concluído).
      expect(moduleDireitoConstitucional?.status).toBe("locked");

      // Retomada aponta para a aula em andamento do módulo 2.
      expect(detail.nextLesson?.lessonId).toBe("course-1-m2-l2");
      expect(detail.nextLesson?.lessonTitle).toBe("Lógica de argumentação");
    });

    it("lança NotFoundError para um slug de curso inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

      await expect(getCourseDetail("user-1", "curso-inexistente")).rejects.toThrow();
    });

    it("lança erro ao tentar ler o detalhe de curso em nome de outro usuário (anti-IDOR)", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

      await expect(getCourseDetail("user-4", "pp-agente")).rejects.toThrow();
    });
  });

  describe("enroll", () => {
    it("é idempotente — matricular duas vezes no mesmo curso não duplica a matrícula", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-2"));

      const before = await getRepositories().enrollments.listByUserId("user-2");
      const beforeCount = before.length;

      const first = await enroll("user-2", "course-3");
      const afterFirst = await getRepositories().enrollments.listByUserId("user-2");
      expect(afterFirst).toHaveLength(beforeCount + 1);

      const second = await enroll("user-2", "course-3");
      const afterSecond = await getRepositories().enrollments.listByUserId("user-2");

      expect(afterSecond).toHaveLength(beforeCount + 1); // não duplicou
      expect(second.enrolledAt).toBe(first.enrolledAt); // mesmo registro reaproveitado
      expect(second.courseId).toBe("course-3");
    });

    it("lança NotFoundError ao matricular em um curso inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-2"));

      await expect(enroll("user-2", "course-inexistente")).rejects.toThrow();
    });

    it("lança erro ao tentar matricular em nome de outro usuário (anti-IDOR)", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));

      await expect(enroll("user-4", "course-3")).rejects.toThrow();
    });
  });

  describe("getResumePoint", () => {
    it("aponta a primeira aula não concluída (1ª aula do curso) para user-3 em pm-soldado", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-3"));

      const resumePoint = await getResumePoint("user-3", "course-1");

      expect(resumePoint?.lessonId).toBe("course-1-m1-l1");
      expect(resumePoint?.lessonTitle).toBe("Interpretação de texto");
    });

    it("lança erro ao tentar ler o ponto de retomada de outro usuário (anti-IDOR)", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-3"));

      await expect(getResumePoint("user-1", "course-1")).rejects.toThrow();
    });
  });
});
