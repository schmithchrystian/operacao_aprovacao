import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock } = vi.hoisted(() => ({ findUniqueMock: vi.fn() }));

vi.mock("@/server/db/prisma", () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

const { PrismaUserRepository } = await import("@/server/repositories/prisma/user-repository");

describe("PrismaUserRepository.findCredentialsByEmail", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns null when the filtered identity is missing or logically deleted", async () => {
    findUniqueMock.mockResolvedValue(null);
    await expect(
      new PrismaUserRepository().findCredentialsByEmail(" REMOVED@EXAMPLE.COM "),
    ).resolves.toBeNull();
    expect(findUniqueMock.mock.calls[0]?.[0].where).toEqual({
      email: "removed@example.com",
      deletedAt: null,
    });
  });

  it("revalidates sessions through an unprivileged projection with soft-delete filtering", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user",
      name: "Test",
      email: "test@example.com",
      role: "STUDENT",
      isActive: false,
      createdAt: new Date("2026-01-01"),
      deletedAt: null,
    });
    const user = await new PrismaUserRepository().findById("user");
    expect(user).toMatchObject({ role: "aluno", isActive: false, deletedAt: null });
    const query = findUniqueMock.mock.calls[0]?.[0];
    expect(query.where).toEqual({ id: "user", deletedAt: null });
    expect(query.select).not.toHaveProperty("passwordHash");
  });

  it("consulta apenas os campos de autenticação e converte o papel para o domínio", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user-4",
      name: "Diego Admin",
      email: "diego.admin@example.com",
      passwordHash: "hash-persistido",
      role: "ADMIN",
      isActive: true,
    });

    await expect(
      new PrismaUserRepository().findCredentialsByEmail("diego.admin@example.com"),
    ).resolves.toEqual({
      id: "user-4",
      name: "Diego Admin",
      email: "diego.admin@example.com",
      passwordHash: "hash-persistido",
      emailVerified: null,
      role: "admin",
      isActive: true,
    });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: "diego.admin@example.com", deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        sessionVersion: true,
        requiresEmailVerification: true,
        emailVerified: true,
      },
    });
  });
});
