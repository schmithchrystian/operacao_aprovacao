import { ensureAuthenticatedUser } from "../helpers/authenticated-user";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";
import type { GeneratePlanInput } from "@/contracts/study-plan";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por "@/server/authorization").
const { generatePlan, getPlan, updatePlanItem, reorderPlanItems } = await import("@/server/services/study-plan");
const { __resetMockStudyPlanStore } = await import("@/server/repositories/mock/study-plan-repository");
const { __resetMockStudyPlanItemStore } = await import("@/server/repositories/mock/study-plan-item-repository");
const { SUBJECT_IDS } = await import("@/mocks");

/**
 * Testes de serviço (I/O) de "Plano de estudos" (Fase 11 — CLAUDE.md §31 item 13): geração via
 * repositórios mock, leitura, atualização de item e reordenação — incluindo autorização
 * (plano de outro usuário sempre rejeitado) e idempotência do reorder.
 */
function fakeSession(id: string): NextAuthSession {
  ensureAuthenticatedUser(id);
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

const BASE_INPUT: Omit<GeneratePlanInput, "subjectWeights"> = {
  examDate: "2026-07-27T00:00:00.000Z",
  startDate: "2026-07-06T00:00:00.000Z",
  daysPerWeek: 6,
  hoursPerDay: 1,
  includeReviews: true,
  includeMockExams: true,
};

const FIXED_NOW = new Date("2026-07-06T08:00:00.000Z");

describe("services/study-plan — generatePlan/getPlan", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockStudyPlanStore();
    __resetMockStudyPlanItemStore();
  });

  it("gera um plano respeitando o peso das matérias (maior peso -> mais tempo total) e a data da prova", async () => {
    const userId = "plan-gen-weight";
    authMock.mockResolvedValue(fakeSession(userId));

    const plan = await generatePlan(
      userId,
      {
        ...BASE_INPUT,
        subjectWeights: [
          { subjectId: SUBJECT_IDS.direitoConstitucional, weight: 4 },
          { subjectId: SUBJECT_IDS.redacao, weight: 1 },
        ],
      },
      FIXED_NOW,
    );

    expect(plan.examDate).toBe("2026-07-27T00:00:00.000Z");
    expect(plan.startDate).toBe("2026-07-06T00:00:00.000Z");
    expect(plan.items.length).toBeGreaterThan(0);

    const constitucional = plan.subjectWeights.find((s) => s.subjectId === SUBJECT_IDS.direitoConstitucional);
    const redacao = plan.subjectWeights.find((s) => s.subjectId === SUBJECT_IDS.redacao);
    expect(constitucional).toBeDefined();
    expect(redacao).toBeDefined();
    expect(constitucional!.weight).toBeGreaterThan(redacao!.weight);
  });

  it("regenerar substitui os itens do plano ativo em vez de acumular (mesmo plano, mesma contagem)", async () => {
    const userId = "plan-gen-regenerate";
    authMock.mockResolvedValue(fakeSession(userId));
    const input: GeneratePlanInput = { ...BASE_INPUT, subjectWeights: [{ subjectId: SUBJECT_IDS.matematica, weight: 1 }] };

    const first = await generatePlan(userId, input, FIXED_NOW);
    const second = await generatePlan(userId, input, new Date("2026-07-06T09:00:00.000Z"));

    expect(second.id).toBe(first.id);
    expect(second.items.length).toBe(first.items.length);
  });

  it("rejeita matéria inexistente (nunca grava um item órfão a partir de um subjectId fabricado)", async () => {
    const userId = "plan-gen-invalid-subject";
    authMock.mockResolvedValue(fakeSession(userId));

    await expect(
      generatePlan(
        userId,
        { ...BASE_INPUT, subjectWeights: [{ subjectId: "subject-inexistente", weight: 1 }] },
        FIXED_NOW,
      ),
    ).rejects.toThrow();
  });

  it("plano recém-gerado (startDate = hoje) não marca os itens do 1º dia como atrasados", async () => {
    const userId = "plan-overdue-today";
    authMock.mockResolvedValue(fakeSession(userId));

    // `FIXED_NOW` (2026-07-06T08:00) tem hora; `startDate`/`targetDate` são meia-noite UTC do
    // mesmo dia. `computeProgress` deve truncar "hoje" antes de comparar — item de HOJE não é
    // atrasado (só `targetDate < dataDeHoje`).
    const plan = await generatePlan(
      userId,
      { ...BASE_INPUT, subjectWeights: [{ subjectId: SUBJECT_IDS.matematica, weight: 1 }] },
      FIXED_NOW,
    );

    // Todo o plano está em [hoje, examDate) → nada atrasado; garante que existe item de hoje.
    expect(plan.items.some((item) => item.targetDate === "2026-07-06T00:00:00.000Z")).toBe(true);
    expect(plan.progress.overdueItems).toBe(0);
  });

  it("daysUntilExam não oscila com a hora do dia (trunca `now` para meia-noite UTC)", async () => {
    const userId = "plan-days-until-exam";
    authMock.mockResolvedValue(fakeSession(userId));

    const input = { ...BASE_INPUT, subjectWeights: [{ subjectId: SUBJECT_IDS.matematica, weight: 1 }] };
    // Mesmo dia civil (2026-07-06), horas diferentes → mesmo `daysUntilExam` (21 dias até 07-27).
    const early = await generatePlan(userId, input, new Date("2026-07-06T00:30:00.000Z"));
    const late = await generatePlan(userId, input, new Date("2026-07-06T23:30:00.000Z"));

    expect(early.progress.daysUntilExam).toBe(21);
    expect(late.progress.daysUntilExam).toBe(21);
  });

  it("getPlan devolve null quando o usuário ainda não gerou nenhum plano", async () => {
    const userId = "plan-none";
    authMock.mockResolvedValue(fakeSession(userId));

    expect(await getPlan(userId)).toBeNull();
  });

  it("getPlan rejeita consultar o plano de outro usuário (anti-IDOR)", async () => {
    authMock.mockResolvedValue(fakeSession("someone-else"));

    await expect(getPlan("victim-user")).rejects.toThrow();
  });
});

describe("services/study-plan — updatePlanItem/reorderPlanItems", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockStudyPlanStore();
    __resetMockStudyPlanItemStore();
  });

  async function seedPlan(userId: string) {
    authMock.mockResolvedValue(fakeSession(userId));
    return generatePlan(
      userId,
      { ...BASE_INPUT, subjectWeights: [{ subjectId: SUBJECT_IDS.matematica, weight: 1 }] },
      FIXED_NOW,
    );
  }

  it("marca um item como concluído e grava completedAt", async () => {
    const userId = "plan-update-done";
    const plan = await seedPlan(userId);
    authMock.mockResolvedValue(fakeSession(userId));

    const firstItem = plan.items[0]!;
    const updated = await updatePlanItem(userId, { planId: plan.id, itemId: firstItem.id, status: "DONE" });

    expect(updated.status).toBe("DONE");
    expect(updated.completedAt).not.toBeNull();
  });

  it("desmarcar um item concluído limpa completedAt", async () => {
    const userId = "plan-update-undone";
    const plan = await seedPlan(userId);
    authMock.mockResolvedValue(fakeSession(userId));

    const firstItem = plan.items[0]!;
    await updatePlanItem(userId, { planId: plan.id, itemId: firstItem.id, status: "DONE" });
    const reverted = await updatePlanItem(userId, { planId: plan.id, itemId: firstItem.id, status: "PENDING" });

    expect(reverted.status).toBe("PENDING");
    expect(reverted.completedAt).toBeNull();
  });

  it("rejeita atualizar item de plano de outro usuário (anti-IDOR)", async () => {
    const owner = "plan-owner-update";
    const plan = await seedPlan(owner);

    authMock.mockResolvedValue(fakeSession("intruder-update"));
    await expect(
      updatePlanItem("intruder-update", { planId: plan.id, itemId: plan.items[0]!.id, status: "DONE" }),
    ).rejects.toThrow();
  });

  it("reordena os itens e persiste a nova ordem (contígua a partir de 0)", async () => {
    const userId = "plan-reorder-basic";
    const plan = await seedPlan(userId);
    authMock.mockResolvedValue(fakeSession(userId));

    const reversedIds = [...plan.items].map((item) => item.id).reverse();
    const reordered = await reorderPlanItems(userId, { planId: plan.id, itemIds: reversedIds });

    expect(reordered.map((item) => item.id)).toEqual(reversedIds);
    // `order` gravado é contíguo 0,1,2,... na ordem final pedida (sem buracos/duplicatas).
    expect(reordered.map((item) => item.order)).toEqual(reordered.map((_, index) => index));

    // Persistido de verdade — uma nova leitura reflete a ordem gravada.
    const refreshed = await getPlan(userId);
    expect(refreshed!.items.map((item) => item.id)).toEqual(reversedIds);
  });

  it("rejeita reordenar com id duplicado na lista (`[A,A,B,...]`)", async () => {
    const userId = "plan-reorder-duplicate";
    const plan = await seedPlan(userId);
    authMock.mockResolvedValue(fakeSession(userId));

    const ids = plan.items.map((item) => item.id);
    // Duplica o primeiro id e descarta o último — mesmo tamanho de lista, mas com repetição.
    const withDuplicate = [ids[0]!, ...ids.slice(0, ids.length - 1)];
    expect(withDuplicate.length).toBe(ids.length);

    await expect(
      reorderPlanItems(userId, { planId: plan.id, itemIds: withDuplicate }),
    ).rejects.toThrow();
  });

  it("reorder é idempotente — repetir a mesma ordem final não altera o resultado", async () => {
    const userId = "plan-reorder-idempotent";
    const plan = await seedPlan(userId);
    authMock.mockResolvedValue(fakeSession(userId));

    const ids = plan.items.map((item) => item.id);
    const first = await reorderPlanItems(userId, { planId: plan.id, itemIds: ids });
    const second = await reorderPlanItems(userId, { planId: plan.id, itemIds: ids });

    expect(second.map((item) => item.id)).toEqual(first.map((item) => item.id));
  });

  it("rejeita reordenar com um conjunto de itens que não corresponde exatamente ao plano", async () => {
    const userId = "plan-reorder-invalid-set";
    const plan = await seedPlan(userId);
    authMock.mockResolvedValue(fakeSession(userId));

    await expect(
      reorderPlanItems(userId, { planId: plan.id, itemIds: ["item-que-nao-existe"] }),
    ).rejects.toThrow();

    // Subconjunto (faltando itens) também é rejeitado.
    const partialIds = plan.items.slice(0, 1).map((item) => item.id);
    await expect(reorderPlanItems(userId, { planId: plan.id, itemIds: partialIds })).rejects.toThrow();
  });

  it("rejeita reordenar plano de outro usuário (anti-IDOR)", async () => {
    const owner = "plan-owner-reorder";
    const plan = await seedPlan(owner);

    authMock.mockResolvedValue(fakeSession("intruder-reorder"));
    await expect(
      reorderPlanItems("intruder-reorder", { planId: plan.id, itemIds: plan.items.map((item) => item.id) }),
    ).rejects.toThrow();
  });
});
