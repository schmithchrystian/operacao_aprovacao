import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

/**
 * Testes de serviço (Fase 17 — gestão de usuários). Alterar papel é SENSÍVEL — só `admin`
 * (moderador é rejeitado, não só aluno). Ativar/desativar é admin+moderador. Conta desativada
 * nunca autentica (`credentials-service`).
 */

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));

const { changeUserRoleForAdmin, setUserActiveForAdmin } = await import("@/server/services/admin/users-service");
const { verifyCredentials } = await import("@/server/auth/credentials-service");
const { getAuditRecords } = await import("@/server/audit");
const { getRepositories } = await import("@/server/repositories");
const { __resetMockUserStore } = await import("@/server/repositories/mock/user-repository");
const { DEV_MOCK_PASSWORD } = await import("@/mocks");

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("services/admin/users — Fase 17", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockUserStore();
  });

  describe("changeUserRoleForAdmin", () => {
    it("moderador NÃO pode alterar papel (só admin)", async () => {
      authMock.mockResolvedValue(fakeSession("moderador", "user-3"));
      await expect(changeUserRoleForAdmin({ userId: "user-1", role: "professor" })).rejects.toThrow(
        "Você não tem permissão",
      );
    });

    it("aluno NÃO pode alterar papel", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));
      await expect(changeUserRoleForAdmin({ userId: "user-2", role: "admin" })).rejects.toThrow();
    });

    it("admin altera o papel do usuário e a mutação é auditada", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      const updated = await changeUserRoleForAdmin({ userId: "user-1", role: "professor" });
      expect(updated.role).toBe("professor");

      const persisted = await getRepositories().users.findById("user-1");
      expect(persisted?.role).toBe("professor");

      const records = getAuditRecords();
      expect(
        records.some(
          (r) => r.operation === "admin.users.change-role" && r.entityId === "user-1" && r.result === "success",
        ),
      ).toBe(true);
    });

    it("rejeita usuário inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      await expect(changeUserRoleForAdmin({ userId: "user-inexistente", role: "admin" })).rejects.toThrow();
    });
  });

  describe("setUserActiveForAdmin", () => {
    it("moderador PODE ativar/desativar conta", async () => {
      authMock.mockResolvedValue(fakeSession("moderador", "user-3"));
      const updated = await setUserActiveForAdmin({ userId: "user-1", isActive: false });
      expect(updated.isActive).toBe(false);
    });

    it("aluno NÃO pode ativar/desativar conta", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "user-1"));
      await expect(setUserActiveForAdmin({ userId: "user-2", isActive: false })).rejects.toThrow();
    });

    it("conta desativada nunca autentica (mesmo com a senha correta)", async () => {
      // Antes de desativar: credenciais corretas autenticam normalmente.
      const before = await verifyCredentials("ana.recruta@example.com", DEV_MOCK_PASSWORD);
      expect(before?.userId).toBe("user-1");

      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      await setUserActiveForAdmin({ userId: "user-1", isActive: false });

      const after = await verifyCredentials("ana.recruta@example.com", DEV_MOCK_PASSWORD);
      expect(after).toBeNull();
    });
  });

  /**
   * Guardas de segurança (achados da revisão de segurança da Fase 17): mock tem exatamente 1
   * admin (user-4) e 1 moderador (user-3), então "último admin" e "alvo elevado" são
   * exercitáveis diretamente.
   */
  describe("guarda de hierarquia (anti-escalonamento por lockout — achado ALTO)", () => {
    it("moderador NÃO pode desativar um admin (FORBIDDEN, não vaza para o serviço)", async () => {
      authMock.mockResolvedValue(fakeSession("moderador", "user-3"));
      await expect(setUserActiveForAdmin({ userId: "user-4", isActive: false })).rejects.toThrow(
        "Apenas um administrador",
      );
      // Alvo permanece intacto.
      const admin = await getRepositories().users.findById("user-4");
      expect(admin?.isActive).toBe(true);
    });

    it("moderador NÃO pode desativar outro moderador", async () => {
      authMock.mockResolvedValue(fakeSession("moderador", "user-3"));
      await expect(setUserActiveForAdmin({ userId: "user-3", isActive: false })).rejects.toThrow(
        "Apenas um administrador",
      );
    });

    it("moderador CONSEGUE desativar aluno e professor (alvos não elevados)", async () => {
      authMock.mockResolvedValue(fakeSession("moderador", "user-3"));

      const aluno = await setUserActiveForAdmin({ userId: "user-1", isActive: false });
      expect(aluno.isActive).toBe(false);

      const professor = await setUserActiveForAdmin({ userId: "user-2", isActive: false });
      expect(professor.isActive).toBe(false);
    });

    it("admin CONSEGUE gerir alvos elevados (desativar um moderador)", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      const updated = await setUserActiveForAdmin({ userId: "user-3", isActive: false });
      expect(updated.isActive).toBe(false);
    });
  });

  describe("proteção do último admin ativo (achado MÉDIO)", () => {
    it("rejeita DESATIVAR o último admin ativo", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      await expect(setUserActiveForAdmin({ userId: "user-4", isActive: false })).rejects.toThrow(
        "último administrador",
      );
      const admin = await getRepositories().users.findById("user-4");
      expect(admin?.isActive).toBe(true);
    });

    it("rejeita REBAIXAR o último admin ativo (inclusive a própria conta)", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));
      await expect(changeUserRoleForAdmin({ userId: "user-4", role: "professor" })).rejects.toThrow(
        "último administrador",
      );
      const admin = await getRepositories().users.findById("user-4");
      expect(admin?.role).toBe("admin");
    });

    it("PERMITE rebaixar/desativar um admin quando existe outro admin ativo", async () => {
      authMock.mockResolvedValue(fakeSession("admin", "user-4"));

      // Promove um segundo admin — agora há 2 admins ativos.
      await changeUserRoleForAdmin({ userId: "user-3", role: "admin" });

      // Rebaixar o primeiro passa a ser permitido (não é mais o último).
      const demoted = await changeUserRoleForAdmin({ userId: "user-4", role: "professor" });
      expect(demoted.role).toBe("professor");
    });
  });
});
