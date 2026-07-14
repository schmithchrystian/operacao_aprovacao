import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

/** Testes de serviço (Fase 17 — avisos/moderação, versão mínima). */

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));

const { broadcastNotificationForAdmin } = await import("@/server/services/admin/notification-service");
const { moderateContentForAdmin } = await import("@/server/services/admin/moderation-service");
const { getRepositories } = await import("@/server/repositories");
const { __resetMockNotificationStore } = await import("@/server/repositories/mock/notification-repository");
const { __resetMockUserStore } = await import("@/server/repositories/mock/user-repository");
const { __resetMockCourseStore } = await import("@/server/repositories/mock/course-repository");

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

const NOW = new Date("2026-07-14T10:00:00.000Z");

describe("services/admin — avisos e moderação (Fase 17)", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockNotificationStore();
    __resetMockUserStore();
    __resetMockCourseStore();
  });

  describe("broadcastNotificationForAdmin", () => {
    it("aluno não pode publicar aviso", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));
      await expect(
        broadcastNotificationForAdmin({ type: "SYSTEM", title: "Aviso", message: "Mensagem" }, NOW),
      ).rejects.toThrow();
    });

    it("moderador publica aviso para todos os usuários ativos", async () => {
      authMock.mockResolvedValue(fakeSession("moderador", "user-3"));
      const result = await broadcastNotificationForAdmin(
        { type: "SYSTEM", title: "Manutenção", message: "O sistema ficará fora do ar." },
        NOW,
      );
      expect(result.recipientCount).toBe(4);

      const notifications = await getRepositories().notifications.listByUserId("user-1");
      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.title).toBe("Manutenção");
    });

    it("respeita o filtro de papéis quando informado", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      const result = await broadcastNotificationForAdmin(
        { type: "COURSE_ANNOUNCEMENT", title: "Novo curso", message: "Confira!", roles: ["aluno"] },
        NOW,
      );
      expect(result.recipientCount).toBe(1);

      const studentNotifications = await getRepositories().notifications.listByUserId("user-1");
      expect(studentNotifications).toHaveLength(1);
      const adminNotifications = await getRepositories().notifications.listByUserId("user-4");
      expect(adminNotifications).toHaveLength(0);
    });
  });

  describe("moderateContentForAdmin", () => {
    it("oculta e reexibe um curso trocando status (reversível, sem exigir confirm)", async () => {
      authMock.mockResolvedValue(fakeSession("moderador", "user-3"));
      await moderateContentForAdmin({ entityType: "course", id: "course-1", hidden: true }, NOW);

      const hidden = await getRepositories().courses.findById("course-1");
      expect(hidden?.status).toBe("ARCHIVED");
      // Some do catálogo público do aluno.
      const catalog = await getRepositories().courses.list();
      expect(catalog.some((c) => c.id === "course-1")).toBe(false);

      await moderateContentForAdmin({ entityType: "course", id: "course-1", hidden: false }, NOW);
      const restored = await getRepositories().courses.findById("course-1");
      expect(restored?.status).toBe("PUBLISHED");
      const catalogAgain = await getRepositories().courses.list();
      expect(catalogAgain.some((c) => c.id === "course-1")).toBe(true);
    });

    it("aluno não pode moderar conteúdo", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));
      await expect(
        moderateContentForAdmin({ entityType: "course", id: "course-1", hidden: true }, NOW),
      ).rejects.toThrow();
    });
  });
});
