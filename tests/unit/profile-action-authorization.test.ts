import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por "@/server/authorization").
const { getOwnProfileAction, getPublicProfileAction, updatePrivacyAction, updateProfileAction } = await import(
  "@/server/actions/profile"
);
const { __resetMockProfileStore } = await import("@/server/repositories/mock/profile-repository");

function fakeSession(id: string): NextAuthSession {
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

/**
 * Testes de autorização/validação na fronteira das Server Actions de perfil (Fase 16 —
 * CLAUDE.md §11/§24/§25): sem sessão, a fronteira devolve `ActionResult` com
 * `ok:false`/`UNAUTHENTICATED` — nunca deixa o erro de domínio propagar cru para a UI, e nunca
 * aceita `userId`/`viewerId` do corpo da requisição (sempre resolvido da sessão real).
 */
describe("actions/profile — autorização na fronteira (ActionResult)", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockProfileStore();
  });

  it("getOwnProfileAction retorna fail UNAUTHENTICATED sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const result = await getOwnProfileAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
  });

  it("getOwnProfileAction retorna ok com o perfil do próprio usuário autenticado", async () => {
    authMock.mockResolvedValue(fakeSession("user-1"));
    const result = await getOwnProfileAction();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.userId).toBe("user-1");
      expect(result.data.isOwnProfile).toBe(true);
    }
  });

  it("getPublicProfileAction retorna fail UNAUTHENTICATED sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const result = await getPublicProfileAction({ targetUserId: "user-1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
  });

  it("getPublicProfileAction retorna fail de validação sem targetUserId", async () => {
    authMock.mockResolvedValue(fakeSession("user-1"));
    const result = await getPublicProfileAction({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("getPublicProfileAction retorna ok consultando o perfil de outro usuário", async () => {
    authMock.mockResolvedValue(fakeSession("user-1"));
    const result = await getPublicProfileAction({ targetUserId: "user-3" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.userId).toBe("user-3");
      expect(result.data.isOwnProfile).toBe(false);
    }
  });

  it("updateProfileAction retorna fail UNAUTHENTICATED sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const result = await updateProfileAction({ bio: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
  });

  it("updateProfileAction retorna fail de validação com payload vazio", async () => {
    authMock.mockResolvedValue(fakeSession("user-1"));
    const result = await updateProfileAction({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("updateProfileAction retorna ok e persiste a alteração do próprio usuário", async () => {
    authMock.mockResolvedValue(fakeSession("user-1"));
    const result = await updateProfileAction({ bio: "Atualizado via action" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.bio).toBe("Atualizado via action");
  });

  it("B1: updateProfileAction rejeita UF fora das 27 unidades federativas", async () => {
    authMock.mockResolvedValue(fakeSession("user-1"));
    const result = await updateProfileAction({ state: "XX" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("B1: updateProfileAction aceita UF válida em minúsculas, coagida para maiúsculas", async () => {
    authMock.mockResolvedValue(fakeSession("user-1"));
    const result = await updateProfileAction({ state: "mg" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.state).toBe("MG");
  });

  it("updatePrivacyAction retorna fail UNAUTHENTICATED sem sessão", async () => {
    authMock.mockResolvedValue(null);
    const result = await updatePrivacyAction({ showInRanking: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
  });

  it("updatePrivacyAction retorna ok e persiste a preferência do próprio usuário", async () => {
    authMock.mockResolvedValue(fakeSession("user-1"));
    const result = await updatePrivacyAction({ showInRanking: false });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.privacy!.showInRanking).toBe(false);
  });
});
