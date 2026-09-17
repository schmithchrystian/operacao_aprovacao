import { ensureAuthenticatedUser } from "../helpers/authenticated-user";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por "@/server/authorization").
const {
  buildSessionAction,
  startStudyMissionAction,
  generatePlanAction,
  getPlanAction,
  updatePlanItemAction,
  reorderPlanItemsAction,
} = await import("@/server/actions/study-plan");
const { __resetMockStudyPlanStore } = await import("@/server/repositories/mock/study-plan-repository");
const { __resetMockStudyPlanItemStore } = await import("@/server/repositories/mock/study-plan-item-repository");
const { __resetMockStudyMissionStore } = await import("@/server/repositories/mock/study-mission-repository");
const { SUBJECT_IDS } = await import("@/mocks");

/**
 * Testes de fronteira (Server Actions — ActionResult) de "Montar estudo" + "Plano de estudos"
 * (Fase 11), mesmo padrão de `tests/unit/courses-action-authorization.test.ts`: sessão mockada
 * via `@/server/auth`, nunca uma sessão real.
 */
function fakeSession(id: string): NextAuthSession {
  ensureAuthenticatedUser(id);
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("actions/study-plan — autorização e validação na fronteira (ActionResult)", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockStudyPlanStore();
    __resetMockStudyPlanItemStore();
    __resetMockStudyMissionStore();
  });

  describe("buildSessionAction", () => {
    it("retorna fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);
      const result = await buildSessionAction({ contentTypes: ["videoaula"], availableMinutes: 30 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
    });

    it("retorna fail VALIDATION_ERROR com contentTypes vazio", async () => {
      authMock.mockResolvedValue(fakeSession("user-build-1"));
      const result = await buildSessionAction({ contentTypes: [], availableMinutes: 30 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna fail VALIDATION_ERROR com availableMinutes abaixo do mínimo", async () => {
      authMock.mockResolvedValue(fakeSession("user-build-2"));
      const result = await buildSessionAction({ contentTypes: ["videoaula"], availableMinutes: 1 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna ok com a sessão gerada somando exatamente availableMinutes", async () => {
      authMock.mockResolvedValue(fakeSession("user-build-3"));
      const result = await buildSessionAction({
        contentTypes: ["videoaula", "questoes", "flashcards", "revisao"],
        availableMinutes: 60,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.totalMinutes).toBe(60);
        expect(result.data.blocks.reduce((sum, block) => sum + block.minutes, 0)).toBe(60);
      }
    });
  });

  describe("startStudyMissionAction", () => {
    it("retorna fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);
      const result = await startStudyMissionAction({ contentTypes: ["videoaula"], availableMinutes: 30 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
    });

    it("retorna ok com a missão iniciada e o bloco inicial (ponto de partida)", async () => {
      authMock.mockResolvedValue(fakeSession("user-mission-1"));
      const result = await startStudyMissionAction({
        contentTypes: ["videoaula", "questoes"],
        availableMinutes: 40,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.mission.status).toBe("ACTIVE");
        expect(result.data.startingBlock).toEqual(result.data.mission.blocks[0]);
      }
    });
  });

  describe("generatePlanAction", () => {
    it("retorna fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);
      const result = await generatePlanAction({
        examDate: "2026-07-27T00:00:00.000Z",
        subjectWeights: [{ subjectId: SUBJECT_IDS.matematica, weight: 1 }],
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
    });

    it("retorna fail VALIDATION_ERROR sem examDate", async () => {
      authMock.mockResolvedValue(fakeSession("user-plan-1"));
      const result = await generatePlanAction({
        subjectWeights: [{ subjectId: SUBJECT_IDS.matematica, weight: 1 }],
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna fail VALIDATION_ERROR quando a data da prova não é depois da data de início", async () => {
      authMock.mockResolvedValue(fakeSession("user-plan-2"));
      const result = await generatePlanAction({
        examDate: "2026-07-01T00:00:00.000Z",
        startDate: "2026-07-06T00:00:00.000Z",
        subjectWeights: [{ subjectId: SUBJECT_IDS.matematica, weight: 1 }],
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna fail VALIDATION_ERROR sem nenhuma matéria informada", async () => {
      authMock.mockResolvedValue(fakeSession("user-plan-3"));
      const result = await generatePlanAction({
        examDate: "2026-07-27T00:00:00.000Z",
        subjectWeights: [],
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna ok com o plano gerado", async () => {
      authMock.mockResolvedValue(fakeSession("user-plan-4"));
      const result = await generatePlanAction({
        examDate: "2026-07-27T00:00:00.000Z",
        startDate: "2026-07-06T00:00:00.000Z",
        daysPerWeek: 6,
        hoursPerDay: 1,
        subjectWeights: [{ subjectId: SUBJECT_IDS.matematica, weight: 1 }],
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getPlanAction", () => {
    it("retorna fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);
      const result = await getPlanAction();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
    });

    it("retorna ok com data null quando o usuário ainda não tem plano", async () => {
      authMock.mockResolvedValue(fakeSession("user-plan-sem-plano"));
      const result = await getPlanAction();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBeNull();
    });
  });

  describe("updatePlanItemAction / reorderPlanItemsAction", () => {
    it("retorna fail UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);

      const updateResult = await updatePlanItemAction({ planId: "p1", itemId: "i1", status: "DONE" });
      expect(updateResult.ok).toBe(false);
      if (!updateResult.ok) expect(updateResult.error.code).toBe("UNAUTHENTICATED");

      const reorderResult = await reorderPlanItemsAction({ planId: "p1", itemIds: ["i1"] });
      expect(reorderResult.ok).toBe(false);
      if (!reorderResult.ok) expect(reorderResult.error.code).toBe("UNAUTHENTICATED");
    });

    it("retorna fail VALIDATION_ERROR quando nenhum campo de atualização é informado", async () => {
      authMock.mockResolvedValue(fakeSession("user-plan-update-1"));
      const result = await updatePlanItemAction({ planId: "p1", itemId: "i1" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("retorna fail NOT_FOUND ao atualizar item de um plano inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("user-plan-update-2"));
      const result = await updatePlanItemAction({ planId: "plano-inexistente", itemId: "item-x", status: "DONE" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });

    it("fluxo completo: gera plano, atualiza item e reordena", async () => {
      const userId = "user-plan-full-flow";
      authMock.mockResolvedValue(fakeSession(userId));

      const generated = await generatePlanAction({
        examDate: "2026-07-27T00:00:00.000Z",
        startDate: "2026-07-06T00:00:00.000Z",
        daysPerWeek: 6,
        hoursPerDay: 1,
        subjectWeights: [{ subjectId: SUBJECT_IDS.matematica, weight: 1 }],
      });
      expect(generated.ok).toBe(true);
      if (!generated.ok) return;

      const firstItem = generated.data.items[0]!;
      const updateResult = await updatePlanItemAction({
        planId: generated.data.id,
        itemId: firstItem.id,
        status: "DONE",
      });
      expect(updateResult.ok).toBe(true);
      if (updateResult.ok) {
        expect(updateResult.data.status).toBe("DONE");
      }

      const reversedIds = [...generated.data.items].map((item) => item.id).reverse();
      const reorderResult = await reorderPlanItemsAction({
        planId: generated.data.id,
        itemIds: reversedIds,
      });
      expect(reorderResult.ok).toBe(true);
      if (reorderResult.ok) {
        expect(reorderResult.data.map((item) => item.id)).toEqual(reversedIds);
      }
    });
  });
});
