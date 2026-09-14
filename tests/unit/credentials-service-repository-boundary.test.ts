import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_PASSWORD_HASH } from "@/mocks";

const { compareMock, findCredentialsByEmailMock } = vi.hoisted(() => ({
  compareMock: vi.fn(),
  findCredentialsByEmailMock: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ default: { compare: compareMock } }));
vi.mock("@/server/repositories", () => ({
  getRepositories: () => ({ users: { findCredentialsByEmail: findCredentialsByEmailMock } }),
}));

const { verifyCredentials } = await import("@/server/auth/credentials-service");

describe("verifyCredentials - fronteira do repositório", () => {
  beforeEach(() => {
    compareMock.mockReset();
    findCredentialsByEmailMock.mockReset();
  });

  it("autentica uma credencial fornecida exclusivamente pelo repositório", async () => {
    findCredentialsByEmailMock.mockResolvedValue({
      id: "persistent-user",
      name: "Usuário Persistido",
      email: "persistent@example.com",
      role: "admin",
      isActive: true,
      passwordHash: "hash-do-repositorio",
    });
    compareMock.mockResolvedValue(true);

    await expect(verifyCredentials(" PERSISTENT@EXAMPLE.COM ", "senha-correta")).resolves.toEqual({
      userId: "persistent-user",
      name: "Usuário Persistido",
      email: "persistent@example.com",
      role: "admin",
      sessionVersion: 0,
    });
    expect(findCredentialsByEmailMock).toHaveBeenCalledWith("persistent@example.com");
    expect(compareMock).toHaveBeenCalledWith("senha-correta", "hash-do-repositorio");
  });

  it("compara contra hash dummy independente das credenciais mock quando o usuário não existe", async () => {
    findCredentialsByEmailMock.mockResolvedValue(null);
    compareMock.mockResolvedValue(false);

    await expect(verifyCredentials("nao-existe@example.com", "qualquer-senha")).resolves.toBeNull();

    const [, hash] = compareMock.mock.calls[0]!;
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
    expect(hash).not.toBe(DEV_PASSWORD_HASH);
  });
});
