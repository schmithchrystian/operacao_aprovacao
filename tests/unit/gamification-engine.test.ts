import { beforeEach, describe, expect, it, vi } from "vitest";

// `engine.ts` importa `./read` (para `syncAchievementsForUser`), que importa
// `@/server/authorization` -> `@/server/auth` (Auth.js/next-auth). Mockar ANTES de importar o
// módulo sob teste — mesmo padrão de `tests/unit/study-tracking-service.test.ts` — evita
// carregar o Auth.js real (que depende de módulos só resolvidos em runtime Next.js).
vi.mock("@/server/auth", () => ({ auth: vi.fn() }));

const {
  awardGamificationEvent,
  computeReward,
  syncAchievementsForUser,
} = await import("@/server/services/gamification/engine");
const { registerGamificationEventHandlers, __resetGamificationRegistration } = await import(
  "@/server/services/gamification/register"
);
const { eventBus } = await import("@/server/events");
const { getRepositories } = await import("@/server/repositories");
const { __resetMockGamificationEventStore } = await import(
  "@/server/repositories/mock/gamification-event-repository"
);
const { __resetMockPointTransactionStore } = await import(
  "@/server/repositories/mock/point-transaction-repository"
);
const { __resetMockUserAchievementStore } = await import(
  "@/server/repositories/mock/user-achievement-repository"
);

/**
 * Testes do motor de gamificação (Fase 8 — CLAUDE.md §15/§25):
 * - idempotência de concessão de pontos (mesma `idempotencyKey` nunca credita 2x);
 * - valores de recompensa batem com `GAMIFICATION_REWARDS` (`config/business.ts`);
 * - evento repetido via `EventBus` é rejeitado (não invoca o handler de novo);
 * - conquistas não duplicam (`syncAchievementsForUser` idempotente);
 * - recuperação de falha parcial (evento gravado sem a transação correspondente) nunca
 *   credita saldo em duplicidade — ver limitação documentada abaixo.
 */
describe("gamification/engine — awardGamificationEvent", () => {
  beforeEach(() => {
    __resetMockGamificationEventStore();
    __resetMockPointTransactionStore();
    __resetMockUserAchievementStore();
  });

  it("credita a recompensa correta para cada tipo de evento (config/business.ts)", () => {
    expect(computeReward("LESSON_COMPLETED")).toEqual({ points: 100, xp: 100 });
    expect(computeReward("MODULE_COMPLETED")).toEqual({ points: 500, xp: 500 });
    expect(computeReward("COURSE_COMPLETED")).toEqual({ points: 2000, xp: 2000 });
    expect(computeReward("STREAK_30")).toEqual({ points: 3000, xp: 3000 });
  });

  it("a mesma idempotencyKey nunca credita 2x (chamada repetida é no-op idempotente)", async () => {
    const input = {
      userId: "eng-user-1",
      type: "LESSON_COMPLETED" as const,
      sourceType: "LESSON",
      sourceId: "lesson-x",
      idempotencyKey: "lesson-completed:eng-user-1:lesson-x",
      reason: "teste",
    };

    const first = await awardGamificationEvent(input);
    expect(first.awardedNow).toBe(true);
    expect(first.transaction.points).toBe(100);

    const second = await awardGamificationEvent(input);
    expect(second.awardedNow).toBe(false);
    expect(second.transaction.id).toBe(first.transaction.id);

    const repos = getRepositories();
    const transactions = await repos.pointTransactions.listByUserId("eng-user-1");
    expect(transactions).toHaveLength(1);
    const { points } = await repos.pointTransactions.sumByUserId("eng-user-1");
    expect(points).toBe(100); // nunca 200 — não dobrou por ter sido chamado 2x.
  });

  it("recupera de uma falha parcial (evento gravado sem a transação) sem duplicar nem perder saldo", async () => {
    const repos = getRepositories();
    const idempotencyKey = "module-completed:eng-user-2:module-x";

    // Simula o cenário de falha transacional descrito no TODO de `engine.ts`: o
    // `GamificationEvent` foi gravado, mas o processo caiu ANTES de gravar o
    // `PointTransaction` correspondente (o mock em memória não tem transação atômica real —
    // ver TODO "MÉDIO" em `engine.ts`/`prisma/point-transaction-repository.ts`).
    await repos.gamificationEvents.create({
      userId: "eng-user-2",
      type: "MODULE_COMPLETED",
      idempotencyKey,
      sourceType: "MODULE",
      sourceId: "module-x",
      points: 500,
      xp: 500,
      ruleVersion: 1,
      status: "PROCESSED",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(await repos.pointTransactions.findByIdempotencyKey(idempotencyKey)).toBeNull();

    // Reprocessar (retry) com os MESMOS dados deve fechar a lacuna: cria a transação
    // ausente, SEM duplicar o `GamificationEvent` já existente.
    const result = await awardGamificationEvent({
      userId: "eng-user-2",
      type: "MODULE_COMPLETED",
      sourceType: "MODULE",
      sourceId: "module-x",
      idempotencyKey,
      reason: "retry",
    });

    expect(result.awardedNow).toBe(true);
    const events = await repos.gamificationEvents.listByUserId("eng-user-2");
    expect(events).toHaveLength(1); // nenhum evento duplicado

    const { points } = await repos.pointTransactions.sumByUserId("eng-user-2");
    expect(points).toBe(500); // creditado exatamente uma vez — nunca saldo parcial nem dobrado
  });
});

describe("gamification/engine — evento repetido via EventBus é rejeitado", () => {
  beforeEach(() => {
    __resetMockGamificationEventStore();
    __resetMockPointTransactionStore();
    __resetMockUserAchievementStore();
    __resetGamificationRegistration();
    registerGamificationEventHandlers();
  });

  it("emitir o mesmo evento de domínio 2x só credita pontos uma vez", async () => {
    const repos = getRepositories();
    const payload = { userId: "eng-user-3", lessonId: "lesson-y", lessonTitle: "Aula Y" };
    const idempotencyKey = "lesson-completed:eng-user-3:lesson-y";

    await eventBus.emit({ type: "LessonCompleted", payload, idempotencyKey, occurredAt: new Date() });
    await eventBus.emit({ type: "LessonCompleted", payload, idempotencyKey, occurredAt: new Date() });

    const transactions = await repos.pointTransactions.listByUserId("eng-user-3");
    expect(transactions).toHaveLength(1);
    const { points } = await repos.pointTransactions.sumByUserId("eng-user-3");
    expect(points).toBe(100);
  });
});

describe("gamification/engine — syncAchievementsForUser (conquistas não duplicam)", () => {
  beforeEach(() => {
    __resetMockGamificationEventStore();
    __resetMockPointTransactionStore();
    __resetMockUserAchievementStore();
  });

  it("desbloqueia 'Primeira vitória' uma única vez mesmo chamado repetidamente", async () => {
    const userId = "eng-user-4";
    await awardGamificationEvent({
      userId,
      type: "LESSON_COMPLETED",
      sourceType: "LESSON",
      sourceId: "lesson-z",
      idempotencyKey: "lesson-completed:eng-user-4:lesson-z",
      reason: "teste",
    });

    const firstSync = await syncAchievementsForUser(userId);
    expect(firstSync.map((a) => a.key)).toContain("first-victory");

    const secondSync = await syncAchievementsForUser(userId);
    expect(secondSync).toHaveLength(0); // nada novo — já desbloqueada

    const repos = getRepositories();
    const unlocked = await repos.userAchievements.listByUserId(userId);
    const firstVictoryEntries = unlocked.filter((entry) => entry.achievementKey === "first-victory");
    expect(firstVictoryEntries).toHaveLength(1); // nunca duplica a linha
  });
});
