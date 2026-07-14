import { describe, expect, it } from "vitest";
import { evaluateFocusHeartbeat } from "@/server/services/focus/focus-heartbeat-evaluator";
import type { FocusSessionEntity } from "@/server/repositories/contracts/focus-session-repository";

/**
 * Testes do núcleo PURO de reconstrução de tempo válido do Modo Foco (Fase 15 — CLAUDE.md
 * §14/§15/§25). Sem I/O — só o veredito de `evaluateFocusHeartbeat` sobre sinais sintéticos,
 * mesmo estilo de `tests/unit/heartbeat-evaluator.test.ts` (Fase 7).
 */

const RECEIVED_AT_BASE = Date.parse("2026-07-14T10:00:00.000Z");

function baseSession(overrides: Partial<FocusSessionEntity> = {}): FocusSessionEntity {
  return {
    id: "focus-session-1",
    userId: "user-x",
    mode: "25_5",
    status: "ACTIVE",
    targetSeconds: 1500,
    breakSeconds: 300,
    subjectId: null,
    topicId: null,
    objective: null,
    startedAt: "2026-07-14T10:00:00.000Z",
    endedAt: null,
    lastHeartbeatAt: "2026-07-14T10:00:00.000Z",
    lastClientTimestamp: null,
    activeSeconds: 0,
    heartbeatCount: 0,
    validHeartbeatCount: 0,
    cyclesPlanned: 1,
    cyclesCompleted: 0,
    goalAchieved: null,
    contentStudied: null,
    focusLevel: null,
    doubtNote: null,
    scored: false,
    updatedAt: "2026-07-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("evaluateFocusHeartbeat", () => {
  it("acumula tempo ativo quando aba visível + interação, dentro do gap máximo", () => {
    const previous = baseSession({ lastClientTimestamp: 1_000 });
    const receivedAt = RECEIVED_AT_BASE + 15_000; // +15s reais

    const result = evaluateFocusHeartbeat({
      signal: { tabVisible: true, interacting: true, clientTimestamp: 2_000 },
      receivedAt,
      previousSession: previous,
    });

    expect(result.flags).toEqual([]);
    expect(result.addedActiveSeconds).toBe(15);
    expect(result.countsAsValid).toBe(true);
    expect(result.updatedSession.activeSeconds).toBe(15);
    expect(result.updatedSession.validHeartbeatCount).toBe(1);
    expect(result.updatedSession.heartbeatCount).toBe(1);
  });

  it("aba oculta descarta o crédito (tab_hidden), mesmo com 'interacting' true", () => {
    const previous = baseSession({ lastClientTimestamp: 1_000 });
    const receivedAt = RECEIVED_AT_BASE + 15_000;

    const result = evaluateFocusHeartbeat({
      signal: { tabVisible: false, interacting: true, clientTimestamp: 2_000 },
      receivedAt,
      previousSession: previous,
    });

    expect(result.flags).toContain("tab_hidden");
    expect(result.addedActiveSeconds).toBe(0);
    expect(result.countsAsValid).toBe(false);
    expect(result.updatedSession.activeSeconds).toBe(0);
    expect(result.updatedSession.validHeartbeatCount).toBe(0);
  });

  it("aba visível sem interação recente descarta o crédito (idle) — detecta pausa", () => {
    const previous = baseSession({ lastClientTimestamp: 1_000 });
    const receivedAt = RECEIVED_AT_BASE + 15_000;

    const result = evaluateFocusHeartbeat({
      signal: { tabVisible: true, interacting: false, clientTimestamp: 2_000 },
      receivedAt,
      previousSession: previous,
    });

    expect(result.flags).toContain("idle");
    expect(result.addedActiveSeconds).toBe(0);
    expect(result.countsAsValid).toBe(false);
  });

  it("heartbeat duplicado (mesmo clientTimestamp) é um no-op — não soma tempo nem atividade", () => {
    const previous = baseSession({
      lastClientTimestamp: 2_000,
      activeSeconds: 15,
      heartbeatCount: 1,
      validHeartbeatCount: 1,
    });
    const receivedAt = RECEIVED_AT_BASE + 15_000;

    const result = evaluateFocusHeartbeat({
      signal: { tabVisible: true, interacting: true, clientTimestamp: 2_000 },
      receivedAt,
      previousSession: previous,
    });

    expect(result.flags).toEqual(["duplicate"]);
    expect(result.addedActiveSeconds).toBe(0);
    expect(result.countsAsValid).toBe(false);
    expect(result.updatedSession.activeSeconds).toBe(15); // inalterado
    expect(result.updatedSession.validHeartbeatCount).toBe(1); // inalterado
    expect(result.updatedSession.heartbeatCount).toBe(2); // conta a tentativa, não soma tempo
  });

  it("intervalo excessivo entre heartbeats é limitado (gap_clamped), não descartado por completo", () => {
    const previous = baseSession({ lastClientTimestamp: 1_000 });
    const receivedAt = RECEIVED_AT_BASE + 10 * 60_000; // +10 min reais (bem acima do limite de 30s)

    const result = evaluateFocusHeartbeat({
      signal: { tabVisible: true, interacting: true, clientTimestamp: 2_000 },
      receivedAt,
      previousSession: previous,
    });

    expect(result.flags).toContain("gap_clamped");
    expect(result.addedActiveSeconds).toBe(30); // limitado a FOCUS.heartbeatMaxGapSeconds
    expect(result.countsAsValid).toBe(true); // ainda conta como atividade real, só o tempo é limitado
  });

  it("heartbeats sucessivos acumulam activeSeconds/validHeartbeatCount corretamente", () => {
    let current = baseSession({ lastClientTimestamp: 1_000 });
    let receivedAt = RECEIVED_AT_BASE;

    for (let i = 0; i < 5; i += 1) {
      receivedAt += 15_000;
      const result = evaluateFocusHeartbeat({
        signal: { tabVisible: true, interacting: true, clientTimestamp: 1_000 + i + 1 },
        receivedAt,
        previousSession: current,
      });
      current = result.updatedSession;
    }

    expect(current.activeSeconds).toBe(75); // 5 * 15s
    expect(current.validHeartbeatCount).toBe(5);
    expect(current.heartbeatCount).toBe(5);
  });
});
