import { ensureAuthenticatedUser } from "../helpers/authenticated-user";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por "@/server/authorization").
const { startFocusSession, focusHeartbeat, finishFocusSession } = await import("@/server/services/focus");
const { getRepositories } = await import("@/server/repositories");
const { __resetMockFocusSessionStore } = await import("@/server/repositories/mock/focus-session-repository");
const { __resetMockGamificationEventStore } = await import("@/server/repositories/mock/gamification-event-repository");
const { __resetMockPointTransactionStore } = await import("@/server/repositories/mock/point-transaction-repository");
const { __resetMockUserAchievementStore } = await import("@/server/repositories/mock/user-achievement-repository");
const { __resetFocusHeartbeatRateLimitStore, __resetFocusLockStore } = await import("@/server/services/focus");

/**
 * Testes de serviço (I/O) do Modo Foco/Pomodoro (Fase 15 — CLAUDE.md §14/§15/§25): duração
 * mínima, atividade real (heartbeats válidos), descarte de aba oculta/heartbeat duplicado,
 * sessão ativa duplicada, idempotência da pontuação/finalização e autorização (anti-IDOR).
 * Mesmo padrão de `tests/unit/flashcards-service.test.ts`/`tests/unit/study-goals.test.ts`.
 *
 * `now` é sempre injetado explicitamente (nunca `vi.setSystemTime`) — todas as funções do
 * serviço aceitam `now: Date` como parâmetro, então o "relógio do servidor" nos testes é só um
 * `Date` avançado manualmente entre chamadas.
 */
function fakeSession(id: string): NextAuthSession {
  ensureAuthenticatedUser(id);
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

function loginAs(userId: string): void {
  authMock.mockResolvedValue(fakeSession(userId));
}

const BASE = new Date("2026-07-14T10:00:00.000Z");

/** Envia `count` heartbeats "bons" (aba visível + interação), espaçados por `stepSeconds` reais
 *  entre cada um, a partir de `startAt`. Devolve o horário do ÚLTIMO heartbeat enviado. */
async function driveGoodHeartbeats(
  userId: string,
  sessionId: string,
  count: number,
  stepSeconds: number,
  startAt: Date,
): Promise<Date> {
  let current = startAt;
  let clientTs = 1;
  for (let i = 0; i < count; i += 1) {
    current = new Date(current.getTime() + stepSeconds * 1000);
    clientTs += 1;
    await focusHeartbeat(
      userId,
      { sessionId, tabVisible: true, interacting: true, clientTimestamp: clientTs },
      current,
    );
  }
  return current;
}

describe("services/focus", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockFocusSessionStore();
    __resetMockGamificationEventStore();
    __resetMockPointTransactionStore();
    __resetMockUserAchievementStore();
    __resetFocusHeartbeatRateLimitStore();
    __resetFocusLockStore();
  });

  describe("startFocusSession", () => {
    it("cria uma sessão ACTIVE com o alvo do modo escolhido", async () => {
      loginAs("focus-start-1");
      const created = await startFocusSession("focus-start-1", { mode: "25_5" }, BASE);

      expect(created.status).toBe("ACTIVE");
      expect(created.targetSeconds).toBe(25 * 60);
      expect(created.breakSeconds).toBe(5 * 60);
      expect(created.elapsedSeconds).toBe(0);
      expect(created.cyclesPlanned).toBe(1);
      expect(created.cyclesCompleted).toBe(0);
    });

    it("modo custom usa os minutos informados pelo aluno", async () => {
      loginAs("focus-start-custom");
      const created = await startFocusSession(
        "focus-start-custom",
        { mode: "custom", customFocusMinutes: 40, customBreakMinutes: 8 },
        BASE,
      );
      expect(created.targetSeconds).toBe(40 * 60);
      expect(created.breakSeconds).toBe(8 * 60);
    });

    it("modo free não tem alvo fixo (targetSeconds = 0)", async () => {
      loginAs("focus-start-free");
      const created = await startFocusSession("focus-start-free", { mode: "free" }, BASE);
      expect(created.targetSeconds).toBe(0);
      expect(created.breakSeconds).toBe(0);
    });

    it("grava matéria/assunto/objetivo informados", async () => {
      loginAs("focus-start-meta");
      const created = await startFocusSession(
        "focus-start-meta",
        { mode: "25_5", subjectId: "subject-1", topicId: "topic-1", objective: "Revisar Direito Penal" },
        BASE,
      );
      expect(created.subjectId).toBe("subject-1");
      expect(created.topicId).toBe("topic-1");
      expect(created.objective).toBe("Revisar Direito Penal");
    });

    it("iniciar uma nova sessão descarta a anterior ainda ativa (sessão simultânea suspeita)", async () => {
      loginAs("focus-duplicate-1");
      const first = await startFocusSession("focus-duplicate-1", { mode: "25_5" }, BASE);
      const second = await startFocusSession(
        "focus-duplicate-1",
        { mode: "50_10" },
        new Date(BASE.getTime() + 1_000),
      );

      expect(second.status).toBe("ACTIVE");

      const repos = getRepositories();
      const discarded = await repos.focusSessions.findById("focus-duplicate-1", first.id);
      expect(discarded?.status).toBe("DISCARDED");

      // A sessão descartada nunca pode ser finalizada/pontuada depois.
      await expect(
        finishFocusSession("focus-duplicate-1", { sessionId: first.id }, new Date(BASE.getTime() + 2_000)),
      ).rejects.toThrow();

      // Só a mais nova está ativa.
      const active = await repos.focusSessions.findActiveByUserId("focus-duplicate-1");
      expect(active?.id).toBe(second.id);
    });

    it("2 starts CONCORRENTES do mesmo usuário nunca deixam 2 sessões ACTIVE simultâneas", async () => {
      loginAs("focus-concurrent-1");

      const results = await Promise.all([
        startFocusSession("focus-concurrent-1", { mode: "25_5" }, BASE),
        startFocusSession("focus-concurrent-1", { mode: "25_5" }, new Date(BASE.getTime() + 1)),
      ]);

      const repos = getRepositories();
      const fetched = await Promise.all(
        results.map((created) => repos.focusSessions.findById("focus-concurrent-1", created.id)),
      );
      const activeCount = fetched.filter((entity) => entity?.status === "ACTIVE").length;
      expect(activeCount).toBe(1);
    });

    it("rejeita quando o userId informado não bate com a sessão autenticada", async () => {
      loginAs("focus-owner-real");
      await expect(startFocusSession("focus-owner-claimed", { mode: "25_5" }, BASE)).rejects.toThrow();
    });
  });

  describe("focusHeartbeat", () => {
    it("acumula tempo ativo em heartbeats válidos sucessivos", async () => {
      loginAs("focus-hb-1");
      const created = await startFocusSession("focus-hb-1", { mode: "25_5" }, BASE);
      const last = await driveGoodHeartbeats("focus-hb-1", created.id, 3, 20, BASE);

      const result = await focusHeartbeat(
        "focus-hb-1",
        { sessionId: created.id, tabVisible: true, interacting: true, clientTimestamp: 999 },
        new Date(last.getTime() + 20_000),
      );

      expect(result.session.elapsedSeconds).toBe(20 * 4); // 4 heartbeats de 20s cada
      expect(result.flags).toEqual([]);
    });

    it("aba oculta e heartbeat duplicado não contam tempo", async () => {
      loginAs("focus-hb-2");
      const created = await startFocusSession("focus-hb-2", { mode: "25_5" }, BASE);

      const hiddenAt = new Date(BASE.getTime() + 20_000);
      const hiddenResult = await focusHeartbeat(
        "focus-hb-2",
        { sessionId: created.id, tabVisible: false, interacting: true, clientTimestamp: 2 },
        hiddenAt,
      );
      expect(hiddenResult.flags).toContain("tab_hidden");
      expect(hiddenResult.session.elapsedSeconds).toBe(0);

      const dupAt = new Date(hiddenAt.getTime() + 20_000);
      const dupResult = await focusHeartbeat(
        "focus-hb-2",
        { sessionId: created.id, tabVisible: true, interacting: true, clientTimestamp: 2 }, // mesmo clientTimestamp
        dupAt,
      );
      expect(dupResult.flags).toEqual(["duplicate"]);
      expect(dupResult.session.elapsedSeconds).toBe(0);
    });

    it("rejeita heartbeat para uma sessão de outro usuário (anti-IDOR)", async () => {
      loginAs("focus-hb-owner");
      const created = await startFocusSession("focus-hb-owner", { mode: "25_5" }, BASE);

      loginAs("focus-hb-intruder");
      await expect(
        focusHeartbeat(
          "focus-hb-intruder",
          { sessionId: created.id, tabVisible: true, interacting: true, clientTimestamp: 2 },
          new Date(BASE.getTime() + 20_000),
        ),
      ).rejects.toThrow();
    });

    it("rejeita heartbeat para sessão inexistente", async () => {
      loginAs("focus-hb-missing");
      await expect(
        focusHeartbeat(
          "focus-hb-missing",
          { sessionId: "sessao-inexistente", tabVisible: true, interacting: true, clientTimestamp: 2 },
          BASE,
        ),
      ).rejects.toThrow();
    });

    it("rejeita heartbeat para sessão já finalizada", async () => {
      loginAs("focus-hb-finished");
      const created = await startFocusSession("focus-hb-finished", { mode: "quick_15" }, BASE);
      await finishFocusSession("focus-hb-finished", { sessionId: created.id }, new Date(BASE.getTime() + 1_000));

      await expect(
        focusHeartbeat(
          "focus-hb-finished",
          { sessionId: created.id, tabVisible: true, interacting: true, clientTimestamp: 2 },
          new Date(BASE.getTime() + 2_000),
        ),
      ).rejects.toThrow();
    });
  });

  describe("finishFocusSession — pontuação (regra dura CLAUDE.md §15)", () => {
    it("sessão sem NENHUM heartbeat válido (contador zerado no cliente) NÃO pontua", async () => {
      loginAs("focus-finish-empty");
      const created = await startFocusSession("focus-finish-empty", { mode: "quick_15" }, BASE);

      // O "cliente" alega que os 15 minutos já passaram, mas nunca enviou heartbeat algum.
      const result = await finishFocusSession(
        "focus-finish-empty",
        { sessionId: created.id },
        new Date(BASE.getTime() + 15 * 60_000),
      );

      expect(result.scored).toBe(false);
      expect(result.points).toBe(0);
      expect(result.xp).toBe(0);
      expect(result.session.status).toBe("FINISHED");
      expect(result.session.cyclesCompleted).toBe(0);
      expect(result.reasonNotScored).not.toBeNull();

      const repos = getRepositories();
      expect((await repos.pointTransactions.listByUserId("focus-finish-empty")).length).toBe(0);
    });

    it("sessão com atividade real suficiente pontua 50 pontos (PomodoroCompleted)", async () => {
      loginAs("focus-finish-valid");
      // quick_15 -> alvo 900s, mínimo para pontuar = 80% = 720s.
      const created = await startFocusSession("focus-finish-valid", { mode: "quick_15" }, BASE);

      // 40 heartbeats bons de 20s reais = 800s ativos (>= 720s) e 40 heartbeats válidos (>= 3).
      const last = await driveGoodHeartbeats("focus-finish-valid", created.id, 40, 20, BASE);

      const result = await finishFocusSession("focus-finish-valid", { sessionId: created.id }, last);

      expect(result.scored).toBe(true);
      expect(result.points).toBe(50);
      expect(result.xp).toBe(50);
      expect(result.reasonNotScored).toBeNull();
      expect(result.session.status).toBe("FINISHED");
      expect(result.session.cyclesCompleted).toBe(1);

      const repos = getRepositories();
      const transactions = await repos.pointTransactions.listByUserId("focus-finish-valid");
      expect(transactions.length).toBe(1);
      expect(transactions[0]!.points).toBe(50);

      const events = await repos.gamificationEvents.listByUserId("focus-finish-valid");
      expect(events.filter((event) => event.type === "POMODORO_COMPLETED")).toHaveLength(1);

      const persisted = await repos.focusSessions.findById("focus-finish-valid", created.id);
      expect(persisted?.validHeartbeatCount).toBe(40); // atividade real: todos os 40 contaram
    });

    it("duração abaixo do mínimo (80% do alvo) não pontua mesmo com heartbeats válidos", async () => {
      loginAs("focus-finish-short");
      const created = await startFocusSession("focus-finish-short", { mode: "quick_15" }, BASE); // mínimo 720s

      // 10 heartbeats bons de 20s = 200s ativos — bem abaixo do mínimo de 720s.
      const last = await driveGoodHeartbeats("focus-finish-short", created.id, 10, 20, BASE);
      const result = await finishFocusSession("focus-finish-short", { sessionId: created.id }, last);

      expect(result.scored).toBe(false);
      expect(result.points).toBe(0);

      const repos = getRepositories();
      expect((await repos.pointTransactions.listByUserId("focus-finish-short")).length).toBe(0);
    });

    it("gate de atividade (heartbeats válidos mínimos) é verificado de forma INDEPENDENTE da duração", async () => {
      // Dado o cap por heartbeat do avaliador (`FOCUS.heartbeatMaxGapSeconds`), `activeSeconds`
      // nunca cresce mais rápido que `validHeartbeatCount * heartbeatMaxGapSeconds` através da
      // API pública — ou seja, atingir a duração mínima de qualquer modo já exige, na prática,
      // heartbeats válidos suficientes. Para provar que a checagem de CONTAGEM em
      // `finishFocusSession` é uma barreira própria (e não só um efeito colateral do cap), este
      // teste manipula o repositório diretamente para alcançar um estado "duração alta, poucos
      // heartbeats" que a API pública nunca produziria sozinha.
      loginAs("focus-finish-activity-gate");
      const created = await startFocusSession("focus-finish-activity-gate", { mode: "quick_15" }, BASE);

      const repos = getRepositories();
      const session = await repos.focusSessions.findById("focus-finish-activity-gate", created.id);
      await repos.focusSessions.save({ ...session!, activeSeconds: 10_000, validHeartbeatCount: 1 });

      const result = await finishFocusSession(
        "focus-finish-activity-gate",
        { sessionId: created.id },
        new Date(BASE.getTime() + 1_000),
      );

      expect(result.scored).toBe(false);
      expect(result.points).toBe(0);
      expect((await repos.pointTransactions.listByUserId("focus-finish-activity-gate")).length).toBe(0);
    });

    it("finalizar a MESMA sessão duas vezes não repontua (idempotente) — 2ª chamada rejeita", async () => {
      loginAs("focus-finish-twice");
      const created = await startFocusSession("focus-finish-twice", { mode: "quick_15" }, BASE);
      const last = await driveGoodHeartbeats("focus-finish-twice", created.id, 40, 20, BASE);

      const first = await finishFocusSession("focus-finish-twice", { sessionId: created.id }, last);
      expect(first.scored).toBe(true);

      await expect(
        finishFocusSession("focus-finish-twice", { sessionId: created.id }, new Date(last.getTime() + 1_000)),
      ).rejects.toThrow();

      const repos = getRepositories();
      const transactions = await repos.pointTransactions.listByUserId("focus-finish-twice");
      expect(transactions.length).toBe(1); // nunca dobra
    });

    it("bloqueia dupla-pontuação por corrida — K finalizações CONCORRENTES da mesma sessão pontuam UMA vez", async () => {
      loginAs("focus-finish-concurrency");
      const created = await startFocusSession("focus-finish-concurrency", { mode: "quick_15" }, BASE);
      const last = await driveGoodHeartbeats("focus-finish-concurrency", created.id, 40, 20, BASE);

      // 5 finishFocusSession CONCORRENTES na MESMA sessão válida. Sem o `withFocusLock(userId)`
      // (ajuste da revisão — MÉDIO), todas leriam `status === "ACTIVE"` antes de qualquer save e
      // TODAS emitiriam PomodoroCompleted (a dupla-pontuação só cairia na janela de idempotência
      // do EventBus/motor, com corrida). Com o lock, só a 1ª executa a seção crítica inteira; as
      // outras 4 reavaliam com a sessão já FINISHED e caem em ConflictError.
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          finishFocusSession("focus-finish-concurrency", { sessionId: created.id }, last),
        ),
      );

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(4);
      for (const result of rejected) {
        if (result.status === "rejected") {
          expect((result.reason as { code?: string }).code).toBe("CONFLICT");
        }
      }
      // A única vencedora pontuou; exatamente 1 PointTransaction de 50 — nunca 5.
      if (fulfilled[0]!.status === "fulfilled") {
        expect(fulfilled[0]!.value.scored).toBe(true);
        expect(fulfilled[0]!.value.points).toBe(50);
      }
      const repos = getRepositories();
      const transactions = await repos.pointTransactions.listByUserId("focus-finish-concurrency");
      expect(transactions.length).toBe(1);
      expect(transactions[0]!.points).toBe(50);
    });

    it("reprocessar o MESMO evento PomodoroCompleted (idempotencyKey igual) não credita pontos duas vezes", async () => {
      loginAs("focus-finish-event-replay");
      const created = await startFocusSession("focus-finish-event-replay", { mode: "quick_15" }, BASE);
      const last = await driveGoodHeartbeats("focus-finish-event-replay", created.id, 40, 20, BASE);
      await finishFocusSession("focus-finish-event-replay", { sessionId: created.id }, last);

      const { eventBus } = await import("@/server/events");
      const { buildIdempotencyKey } = await import("@/server/services/gamification");
      await eventBus.emit({
        type: "PomodoroCompleted",
        payload: { userId: "focus-finish-event-replay", pomodoroSessionId: created.id },
        idempotencyKey: buildIdempotencyKey("POMODORO_COMPLETED", "focus-finish-event-replay", created.id),
        occurredAt: last,
      });

      const repos = getRepositories();
      expect((await repos.pointTransactions.listByUserId("focus-finish-event-replay")).length).toBe(1);
    });

    it("rejeita finalizar a sessão de outro usuário (anti-IDOR)", async () => {
      loginAs("focus-finish-owner");
      const created = await startFocusSession("focus-finish-owner", { mode: "25_5" }, BASE);

      loginAs("focus-finish-intruder");
      await expect(
        finishFocusSession("focus-finish-intruder", { sessionId: created.id }, BASE),
      ).rejects.toThrow();
    });

    it("grava os metadados do formulário de encerramento mesmo quando não pontua", async () => {
      loginAs("focus-finish-metadata");
      const created = await startFocusSession("focus-finish-metadata", { mode: "quick_15" }, BASE);

      const result = await finishFocusSession(
        "focus-finish-metadata",
        {
          sessionId: created.id,
          goalAchieved: false,
          contentStudied: "Revisão de crimes contra a administração pública",
          focusLevel: 2,
          doubtNote: "Diferença entre peculato e concussão",
        },
        new Date(BASE.getTime() + 1_000),
      );

      expect(result.scored).toBe(false);
      // O DTO público não expõe os campos de formulário diretamente (não fazem parte de
      // `FocusSessionDTO`), mas a persistência é verificada via repositório.
      const repos = getRepositories();
      const persisted = await repos.focusSessions.findById("focus-finish-metadata", created.id);
      expect(persisted?.goalAchieved).toBe(false);
      expect(persisted?.contentStudied).toBe("Revisão de crimes contra a administração pública");
      expect(persisted?.focusLevel).toBe(2);
      expect(persisted?.doubtNote).toBe("Diferença entre peculato e concussão");
    });
  });
});
