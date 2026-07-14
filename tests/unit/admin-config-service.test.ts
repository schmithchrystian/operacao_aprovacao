import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

/**
 * Testes de serviço (Fase 17 — configuração). Só `admin` (nem moderador). Override aplica e
 * PERSISTE no store entre chamadas (mesmo processo); pesos de ranking devem somar 1.
 */

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));

const { getBusinessConfigForAdmin, updateBusinessConfigForAdmin } = await import(
  "@/server/services/admin/config-service"
);
const { __resetBusinessConfigOverrideStore } = await import("@/server/services/admin/config-store");
const { LESSON_COMPLETION_MIN_PERCENT, RANKING_WEIGHTS } = await import("@/config/business");

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("services/admin/config — Fase 17", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetBusinessConfigOverrideStore();
  });

  it("moderador NÃO pode ler nem editar configuração (só admin)", async () => {
    authMock.mockResolvedValue(fakeSession("moderador", "user-3"));
    await expect(getBusinessConfigForAdmin()).rejects.toThrow("Você não tem permissão");
    await expect(updateBusinessConfigForAdmin({ lessonCompletionMinPercent: 0.9 })).rejects.toThrow();
  });

  it("sem override, devolve os defaults de @/config/business.ts", async () => {
    authMock.mockResolvedValue(fakeSession("admin", "user-4"));
    const config = await getBusinessConfigForAdmin();
    expect(config.hasOverrides).toBe(false);
    expect(config.lessonCompletionMinPercent).toBe(LESSON_COMPLETION_MIN_PERCENT);
    expect(config.rankingWeights.simuladoPerformance).toBe(RANKING_WEIGHTS.simuladoPerformance);
  });

  it("aplica e PERSISTE o override entre chamadas subsequentes", async () => {
    authMock.mockResolvedValue(fakeSession("admin", "user-4"));
    const updated = await updateBusinessConfigForAdmin({ lessonCompletionMinPercent: 0.9 });
    expect(updated.lessonCompletionMinPercent).toBe(0.9);
    expect(updated.hasOverrides).toBe(true);

    // Nova leitura, chamada separada — o valor persiste no store (não é um efeito local).
    const readAgain = await getBusinessConfigForAdmin();
    expect(readAgain.lessonCompletionMinPercent).toBe(0.9);
    expect(readAgain.hasOverrides).toBe(true);
    // Valores não tocados continuam no default.
    expect(readAgain.dailyGoalTargetPoints).toBeGreaterThan(0);
  });

  it("rejeita pesos de ranking que não somam 1", async () => {
    authMock.mockResolvedValue(fakeSession("admin", "user-4"));
    await expect(
      updateBusinessConfigForAdmin({ rankingWeights: { simuladoPerformance: 0.9 } }),
    ).rejects.toThrow("somar 1");
  });

  it("aceita pesos de ranking que somam 1 (considerando os demais já configurados)", async () => {
    authMock.mockResolvedValue(fakeSession("admin", "user-4"));
    const currentSum = Object.values(RANKING_WEIGHTS).reduce((total, weight) => total + weight, 0);
    expect(currentSum).toBeCloseTo(1, 3);

    const updated = await updateBusinessConfigForAdmin({
      rankingWeights: {
        simuladoPerformance: RANKING_WEIGHTS.simuladoPerformance + 0.05,
        lessonsCompleted: RANKING_WEIGHTS.lessonsCompleted - 0.05,
      },
    });
    expect(updated.rankingWeights.simuladoPerformance).toBeCloseTo(RANKING_WEIGHTS.simuladoPerformance + 0.05, 5);
  });

  it("override de conquista/pontuação específica não altera as demais chaves", async () => {
    authMock.mockResolvedValue(fakeSession("admin", "user-4"));
    const updated = await updateBusinessConfigForAdmin({
      gamificationRewards: { LESSON_COMPLETED: { points: 200, xp: 200 } },
    });
    expect(updated.gamificationRewards.LESSON_COMPLETED).toEqual({ points: 200, xp: 200 });
    // Demais eventos permanecem no default (merge parcial, não substitui o objeto inteiro).
    expect(updated.gamificationRewards.QUESTION_CORRECT.points).toBeGreaterThan(0);
  });
});
