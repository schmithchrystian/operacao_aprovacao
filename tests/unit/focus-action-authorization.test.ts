import { ensureAuthenticatedUser } from "../helpers/authenticated-user";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por "@/server/authorization").
const { startFocusSessionAction, finishFocusSessionAction } = await import("@/server/actions/focus");
const { __resetMockFocusSessionStore } = await import("@/server/repositories/mock/focus-session-repository");
const { __resetMockGamificationEventStore } = await import("@/server/repositories/mock/gamification-event-repository");
const { __resetMockPointTransactionStore } = await import("@/server/repositories/mock/point-transaction-repository");
const { __resetMockUserAchievementStore } = await import("@/server/repositories/mock/user-achievement-repository");
const { __resetFocusHeartbeatRateLimitStore, __resetFocusLockStore } = await import("@/server/services/focus");

/**
 * Testes de fronteira (Server Actions — ActionResult) do Modo Foco/Pomodoro (Fase 15):
 * autorização (sessão ausente -> UNAUTHENTICATED; sessão de outro usuário -> NOT_FOUND) e
 * validação de entrada (Zod -> VALIDATION_ERROR) na fronteira, além do fluxo feliz e da
 * dupla-finalização (-> CONFLICT). Mesmo padrão de
 * `tests/unit/flashcards-action-authorization.test.ts`.
 */
function fakeSession(id: string): NextAuthSession {
  ensureAuthenticatedUser(id);
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("actions/focus — autorização e validação na fronteira (ActionResult)", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockFocusSessionStore();
    __resetMockGamificationEventStore();
    __resetMockPointTransactionStore();
    __resetMockUserAchievementStore();
    __resetFocusHeartbeatRateLimitStore();
    __resetFocusLockStore();
  });

  describe("startFocusSessionAction", () => {
    it("retorna fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);
      const result = await startFocusSessionAction({ mode: "25_5" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
    });

    it("retorna fail VALIDATION_ERROR com modo inválido", async () => {
      authMock.mockResolvedValue(fakeSession("focus-action-invalid-mode"));
      const result = await startFocusSessionAction({ mode: "invalido" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna fail VALIDATION_ERROR no modo custom sem customFocusMinutes", async () => {
      authMock.mockResolvedValue(fakeSession("focus-action-custom-missing"));
      const result = await startFocusSessionAction({ mode: "custom" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna fail VALIDATION_ERROR com customFocusMinutes fora dos limites", async () => {
      authMock.mockResolvedValue(fakeSession("focus-action-custom-oob"));
      const result = await startFocusSessionAction({ mode: "custom", customFocusMinutes: 999 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna ok com a sessão criada para o aluno autenticado", async () => {
      authMock.mockResolvedValue(fakeSession("focus-action-ok"));
      const result = await startFocusSessionAction({ mode: "50_10" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.status).toBe("ACTIVE");
        expect(result.data.targetSeconds).toBe(50 * 60);
      }
    });
  });

  describe("finishFocusSessionAction", () => {
    it("retorna fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);
      const result = await finishFocusSessionAction({ sessionId: "qualquer" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
    });

    it("retorna fail VALIDATION_ERROR sem sessionId", async () => {
      authMock.mockResolvedValue(fakeSession("focus-action-finish-invalid"));
      const result = await finishFocusSessionAction({});
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna fail VALIDATION_ERROR com focusLevel fora do intervalo 1-5", async () => {
      authMock.mockResolvedValue(fakeSession("focus-action-finish-level"));
      const started = await startFocusSessionAction({ mode: "25_5" });
      expect(started.ok).toBe(true);
      if (!started.ok) return;

      const result = await finishFocusSessionAction({ sessionId: started.data.id, focusLevel: 9 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna fail NOT_FOUND para uma sessão inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("focus-action-finish-nf"));
      const result = await finishFocusSessionAction({ sessionId: "sessao-inexistente" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });

    it("retorna fail NOT_FOUND ao tentar finalizar a sessão de outro usuário (anti-IDOR)", async () => {
      authMock.mockResolvedValue(fakeSession("focus-action-owner"));
      const started = await startFocusSessionAction({ mode: "25_5" });
      expect(started.ok).toBe(true);
      if (!started.ok) return;

      authMock.mockResolvedValue(fakeSession("focus-action-intruder"));
      const result = await finishFocusSessionAction({ sessionId: started.data.id });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });

    it("sessão sem atividade retorna ok com scored=false (registra, mas não pontua)", async () => {
      authMock.mockResolvedValue(fakeSession("focus-action-noscore"));
      const started = await startFocusSessionAction({ mode: "quick_15" });
      expect(started.ok).toBe(true);
      if (!started.ok) return;

      const result = await finishFocusSessionAction({ sessionId: started.data.id });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.scored).toBe(false);
        expect(result.data.points).toBe(0);
        expect(result.data.session.status).toBe("FINISHED");
      }
    });

    it("retorna fail CONFLICT ao finalizar a mesma sessão duas vezes", async () => {
      authMock.mockResolvedValue(fakeSession("focus-action-twice"));
      const started = await startFocusSessionAction({ mode: "quick_15" });
      expect(started.ok).toBe(true);
      if (!started.ok) return;

      const first = await finishFocusSessionAction({ sessionId: started.data.id });
      expect(first.ok).toBe(true);

      const second = await finishFocusSessionAction({ sessionId: started.data.id });
      expect(second.ok).toBe(false);
      if (!second.ok) expect(second.error.code).toBe("CONFLICT");
    });

    it("aceita metadados opcionais do formulário de encerramento", async () => {
      authMock.mockResolvedValue(fakeSession("focus-action-metadata"));
      const started = await startFocusSessionAction({ mode: "quick_15" });
      expect(started.ok).toBe(true);
      if (!started.ok) return;

      const result = await finishFocusSessionAction({
        sessionId: started.data.id,
        goalAchieved: true,
        contentStudied: "Resolvi 20 questões de português",
        focusLevel: 4,
        doubtNote: "Rever regência verbal",
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("fluxo completo", () => {
    it("inicia, envia sinal de troca de sessão simultânea e finaliza descartando a anterior", async () => {
      authMock.mockResolvedValue(fakeSession("focus-action-flow"));

      const first = await startFocusSessionAction({ mode: "25_5" });
      expect(first.ok).toBe(true);
      if (!first.ok) return;

      const second = await startFocusSessionAction({ mode: "quick_15" });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.data.id).not.toBe(first.data.id);

      // A primeira sessão foi descartada — finalizá-la agora é rejeitado.
      const finishFirst = await finishFocusSessionAction({ sessionId: first.data.id });
      expect(finishFirst.ok).toBe(false);
      if (!finishFirst.ok) expect(finishFirst.error.code).toBe("CONFLICT");

      // A segunda (mais recente) segue ativa e pode ser finalizada normalmente.
      const finishSecond = await finishFocusSessionAction({ sessionId: second.data.id });
      expect(finishSecond.ok).toBe(true);
    });
  });
});
