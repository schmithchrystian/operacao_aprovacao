import { describe, expect, it } from "vitest";
import { verifyCredentials } from "@/server/auth/credentials-service";
import { DEV_MOCK_PASSWORD } from "@/mocks";

describe("verifyCredentials", () => {
  it("retorna null quando a senha está errada", async () => {
    const session = await verifyCredentials("ana.recruta@example.com", "senha-errada");

    expect(session).toBeNull();
  });

  it("retorna null para e-mail que não existe nos mocks", async () => {
    const session = await verifyCredentials("ninguem@example.com", DEV_MOCK_PASSWORD);

    expect(session).toBeNull();
  });

  it("retorna a sessão com o papel correto quando a senha está certa (aluno)", async () => {
    const session = await verifyCredentials("ana.recruta@example.com", DEV_MOCK_PASSWORD);

    expect(session).not.toBeNull();
    expect(session?.role).toBe("aluno");
    expect(session?.userId).toBe("user-1");
  });

  it("retorna a sessão com o papel correto quando a senha está certa (admin)", async () => {
    const session = await verifyCredentials("diego.admin@example.com", DEV_MOCK_PASSWORD);

    expect(session).not.toBeNull();
    expect(session?.role).toBe("admin");
    expect(session?.userId).toBe("user-4");
  });

  it("é case-insensitive para o e-mail", async () => {
    const session = await verifyCredentials("ANA.RECRUTA@EXAMPLE.COM", DEV_MOCK_PASSWORD);

    expect(session?.userId).toBe("user-1");
  });
});
