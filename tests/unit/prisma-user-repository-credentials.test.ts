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

  it("consulta apenas os campos de autenticação e converte o papel para o domínio", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user-4",
      name: "Diego Admin",
      email: "diego.admin@example.com",
      passwordHash: "hash-persistido",
      role: "ADMIN",
      isActive: true,
    });

    await expect(new PrismaUserRepository().findCredentialsByEmail("diego.admin@example.com")).resolves.toEqual({
      id: "user-4",
      name: "Diego Admin",
      email: "diego.admin@example.com",
      passwordHash: "hash-persistido",
      role: "admin",
      isActive: true,
    });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: "diego.admin@example.com" },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
      },
    });
  });
});
