import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

/**
 * Testes de serviço (Fase 17 — agente `backend`, administração). Cobre o caminho vertical
 * priorizado (Curso → Módulo → Aula, Questão, Conquista): RBAC (admin/moderador podem gerir
 * conteúdo; aluno nunca), soft-delete (não apaga de fato, só marca `deletedAt`) exigindo
 * `confirm` na Action, reordenação e "vincular vídeo", e auditoria de toda mutação.
 */

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));

const { createCourseForAdmin, updateCourseForAdmin, archiveCourseForAdmin, listCoursesForAdmin } = await import(
  "@/server/services/admin/course-service"
);
const { createModuleForAdmin, reorderModulesForAdmin, listModulesForAdmin } = await import(
  "@/server/services/admin/module-service"
);
const { createLessonForAdmin, linkLessonVideoForAdmin, reorderLessonsForAdmin } = await import(
  "@/server/services/admin/lesson-service"
);
const { createQuestionForAdmin, updateQuestionForAdmin, archiveQuestionForAdmin } = await import(
  "@/server/services/admin/question-service"
);
const {
  createAchievementForAdmin,
  updateAchievementForAdmin,
  archiveAchievementForAdmin,
  listAchievementsForAdmin,
} = await import("@/server/services/admin/achievement-service");
const { getAuditRecords } = await import("@/server/audit");
const { getRepositories } = await import("@/server/repositories");
const { __resetMockCourseStore } = await import("@/server/repositories/mock/course-repository");
const { __resetMockModuleStore } = await import("@/server/repositories/mock/module-repository");
const { __resetMockLessonStore } = await import("@/server/repositories/mock/lesson-repository");
const { __resetMockQuestionStore } = await import("@/server/repositories/mock/question-repository");
const { __resetMockQuestionOptionStore } = await import("@/server/repositories/mock/question-option-repository");
const { __resetMockAchievementStore } = await import("@/server/repositories/mock/achievement-repository");

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

const NOW = new Date("2026-07-14T10:00:00.000Z");

describe("services/admin — CRUD de conteúdo (Fase 17)", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockCourseStore();
    __resetMockModuleStore();
    __resetMockLessonStore();
    __resetMockQuestionStore();
    __resetMockQuestionOptionStore();
    __resetMockAchievementStore();
  });

  describe("Cursos", () => {
    it("aluno não pode criar curso (ForbiddenError)", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));
      await expect(
        createCourseForAdmin(
          { slug: "novo-curso", title: "Novo", description: "Desc", contestId: "contest-pm-soldado" },
          NOW,
        ),
      ).rejects.toThrow("Você não tem permissão");
    });

    it("moderador pode criar e editar curso; admin pode arquivar (soft-delete)", async () => {
      authMock.mockResolvedValue(fakeSession("moderador", "user-3"));
      const created = await createCourseForAdmin(
        {
          slug: "curso-moderador",
          title: "Curso do moderador",
          description: "Descrição",
          contestId: "contest-pm-soldado",
        },
        NOW,
      );
      expect(created.status).toBe("DRAFT");
      expect(created.deletedAt).toBeNull();

      const updated = await updateCourseForAdmin({ id: created.id, status: "PUBLISHED" }, NOW);
      expect(updated.status).toBe("PUBLISHED");

      // Moderador NÃO pode arquivar (destrutivo, só admin).
      await expect(archiveCourseForAdmin(created.id, NOW)).rejects.toThrow("Você não tem permissão");

      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      const archived = await archiveCourseForAdmin(created.id, NOW);
      expect(archived.deletedAt).toBe(NOW.toISOString());

      // Soft-delete NÃO apaga de fato — continua recuperável via `listForAdmin`/repositório.
      const stillThere = await getRepositories().courses.findById(created.id);
      expect(stillThere).not.toBeNull();
      expect(stillThere?.deletedAt).toBe(NOW.toISOString());

      const adminList = await listCoursesForAdmin();
      expect(adminList.some((course) => course.id === created.id)).toBe(true);
    });

    it("rejeita criar curso com concurso inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      await expect(
        createCourseForAdmin(
          { slug: "x", title: "X", description: "d", contestId: "contest-inexistente" },
          NOW,
        ),
      ).rejects.toThrow();
    });

    it("toda mutação de curso gera AuditLog (sucesso e falha)", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      await createCourseForAdmin(
        { slug: "curso-auditado", title: "Auditado", description: "d", contestId: "contest-pm-soldado" },
        NOW,
      );
      const records = getAuditRecords();
      expect(records.some((r) => r.operation === "admin.courses.create" && r.result === "success")).toBe(true);

      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));
      await expect(
        createCourseForAdmin(
          { slug: "outro", title: "Outro", description: "d", contestId: "contest-pm-soldado" },
          NOW,
        ),
      ).rejects.toThrow();
      expect(records.some((r) => r.operation === "admin.courses.create" && r.result === "failure")).toBe(true);
    });
  });

  describe("Módulos e Aulas (reordenar, vincular vídeo)", () => {
    it("cria módulo/aula e reordena módulos do curso", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      const moduleA = await createModuleForAdmin(
        { courseId: "course-1", subjectId: "subject-matematica", slug: "mod-a", title: "Módulo A" },
        NOW,
      );
      const moduleB = await createModuleForAdmin(
        { courseId: "course-1", subjectId: "subject-matematica", slug: "mod-b", title: "Módulo B" },
        NOW,
      );
      expect(moduleB.order).toBeGreaterThan(moduleA.order);

      const allModules = await listModulesForAdmin("course-1");
      const orderedIds = [...allModules.map((m) => m.id)].reverse();
      const reordered = await reorderModulesForAdmin({ courseId: "course-1", moduleIds: orderedIds }, NOW);
      expect(reordered.map((m) => m.id)).toEqual(orderedIds);
    });

    it("cria aula e vincula vídeo (setVideoUrl)", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      const lesson = await createLessonForAdmin(
        { moduleId: "course-1-m1", title: "Aula nova", durationMinutes: 20 },
        NOW,
      );
      expect(lesson.videoUrl).toBeNull();

      const linked = await linkLessonVideoForAdmin({ id: lesson.id, videoUrl: "https://videos.example.com/aula.mp4" }, NOW);
      expect(linked.videoUrl).toBe("https://videos.example.com/aula.mp4");

      const unlinked = await linkLessonVideoForAdmin({ id: lesson.id, videoUrl: null }, NOW);
      expect(unlinked.videoUrl).toBeNull();
    });

    it("reordenar aulas rejeita lista que não corresponde ao módulo atual", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      await expect(
        reorderLessonsForAdmin({ moduleId: "course-1-m1", lessonIds: ["id-que-nao-existe"] }, NOW),
      ).rejects.toThrow();
    });
  });

  describe("Questões", () => {
    it("cria questão com alternativas e rejeita mais de uma correta (defesa em profundidade)", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      await expect(
        createQuestionForAdmin(
          {
            statement: "2 + 2 = ?",
            subjectId: "subject-matematica",
            difficulty: "EASY",
            options: [
              { label: "A", text: "3", isCorrect: false },
              { label: "B", text: "4", isCorrect: true },
              { label: "C", text: "5", isCorrect: true },
            ],
          },
          NOW,
        ),
      ).rejects.toThrow("exatamente uma alternativa");
    });

    it("cria, edita e arquiva (soft-delete) uma questão", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      const created = await createQuestionForAdmin(
        {
          statement: "2 + 2 = ?",
          subjectId: "subject-matematica",
          difficulty: "EASY",
          options: [
            { label: "A", text: "3", isCorrect: false },
            { label: "B", text: "4", isCorrect: true },
          ],
        },
        NOW,
      );
      expect(created.options).toHaveLength(2);
      expect(created.status).toBe("DRAFT");

      const updated = await updateQuestionForAdmin({ id: created.id, status: "PUBLISHED" }, NOW);
      expect(updated.status).toBe("PUBLISHED");

      const archived = await archiveQuestionForAdmin(created.id, NOW);
      expect(archived.deletedAt).toBe(NOW.toISOString());

      // Soft-delete não apaga de fato.
      const stillThere = await getRepositories().questions.findById(created.id);
      expect(stillThere).not.toBeNull();

      // Nunca mais volta em `list()` (student-facing) mesmo se alguém pedir status ARCHIVED.
      const studentVisible = await getRepositories().questions.list({ status: "ARCHIVED" });
      expect(studentVisible.some((q) => q.id === created.id)).toBe(false);
    });
  });

  describe("Conquistas", () => {
    it("aluno não pode criar conquista; admin pode criar/editar/arquivar", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));
      await expect(
        createAchievementForAdmin({ key: "nova-conquista", name: "Nova" }, NOW),
      ).rejects.toThrow("Você não tem permissão");

      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      const created = await createAchievementForAdmin({ key: "nova-conquista", name: "Nova", points: 10 }, NOW);
      expect(created.points).toBe(10);

      const updated = await updateAchievementForAdmin({ id: created.id, points: 50 }, NOW);
      expect(updated.points).toBe(50);

      const archived = await archiveAchievementForAdmin(created.id, NOW);
      expect(archived.deletedAt).toBe(NOW.toISOString());

      const adminList = await listAchievementsForAdmin();
      expect(adminList.some((a) => a.id === created.id)).toBe(true);
    });

    it("rejeita chave de conquista duplicada", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      await createAchievementForAdmin({ key: "chave-unica", name: "Uma" }, NOW);
      await expect(createAchievementForAdmin({ key: "chave-unica", name: "Duas" }, NOW)).rejects.toThrow();
    });
  });
});
