import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

/** Testes de serviço (Fase 17 — visualização do log de auditoria). Só `admin`. */

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));

const { listAuditLogForAdmin } = await import("@/server/services/admin/audit-service");
const { createSubjectForAdmin } = await import("@/server/services/admin/subject-service");
const { __resetMockSubjectStore } = await import("@/server/repositories/mock/subject-repository");

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

const NOW = new Date("2026-07-14T10:00:00.000Z");

describe("services/admin/audit — Fase 17", () => {
  it("records a denied administrative operation without invoking its handler", async () => {
    const { withAdminAudit } = await import("@/server/audit/with-admin-audit");
    const { getAuditRecords } = await import("@/server/audit/log");
    authMock.mockResolvedValue(null);
    const handler = vi.fn();
    await expect(
      withAdminAudit({ operation: "test.denied", entity: "Test" }, handler)(),
    ).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
    expect(
      getAuditRecords().some(
        (entry) => entry.operation === "test.denied" && entry.result === "failure",
      ),
    ).toBe(true);
  });
  beforeEach(() => {
    authMock.mockReset();
    __resetMockSubjectStore();
  });

  it("moderador NÃO pode visualizar o log de auditoria (só admin)", async () => {
    authMock.mockResolvedValue(fakeSession("moderador", "user-3"));
    await expect(listAuditLogForAdmin({ page: 1, pageSize: 20 })).rejects.toThrow(
      "Você não tem permissão",
    );
  });

  it("admin visualiza entradas registradas por operações administrativas anteriores", async () => {
    authMock.mockResolvedValue(fakeSession("admin", "user-4"));
    await createSubjectForAdmin({ name: "Nova Matéria" }, NOW);

    const page = await listAuditLogForAdmin({ page: 1, pageSize: 20 });
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.some((entry) => entry.operation === "admin.subjects.create")).toBe(true);
    // Nunca deve conter dados sensíveis não relacionados — cada entrada só tem os campos do
    // contrato (operation/userId/entity/entityId/result/correlationId/metadata).
    for (const entry of page.items) {
      expect(
        Object.keys(entry).every((key) =>
          [
            "operation",
            "userId",
            "entity",
            "entityId",
            "result",
            "correlationId",
            "metadata",
          ].includes(key),
        ),
      ).toBe(true);
    }
  });

  it("filtra por operação", async () => {
    authMock.mockResolvedValue(fakeSession("admin", "user-4"));
    await createSubjectForAdmin({ name: "Outra Matéria" }, NOW);

    const filtered = await listAuditLogForAdmin({
      operation: "admin.subjects.create",
      page: 1,
      pageSize: 20,
    });
    expect(filtered.items.every((entry) => entry.operation === "admin.subjects.create")).toBe(true);
  });
});
