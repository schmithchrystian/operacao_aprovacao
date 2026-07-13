import { describe, expect, it } from "vitest";
import {
  evaluateHeartbeat,
  mergeIntervals,
  sumIntervalSeconds,
} from "@/server/services/study-tracking/heartbeat-evaluator";
import type { StudySessionEntity } from "@/server/repositories/contracts/study-session-repository";

/**
 * Testes do núcleo PURO de reconstrução de progresso/tempo válido (Fase 7 — CLAUDE.md §13/§14/§25).
 * Sem I/O, sem mocks de repositório/sessão — só o veredito de `evaluateHeartbeat` sobre sinais
 * sintéticos, para exercitar cada regra de forma determinística e independente do relógio real.
 */

const CANONICAL_DURATION = 1800; // 30 min, mesma escala de "course-1-m1-l1" no catálogo mock.

function baseSession(overrides: Partial<StudySessionEntity> = {}): StudySessionEntity {
  return {
    id: "session-1",
    userId: "user-x",
    lessonId: "lesson-x",
    source: "LESSON",
    status: "ACTIVE",
    startedAt: "2026-07-01T10:00:00.000Z",
    lastHeartbeatAt: "2026-07-01T10:00:00.000Z",
    lastPositionSeconds: 0,
    lastClientTimestamp: 1_000,
    coveredIntervals: [],
    validSeconds: 0,
    heartbeatCount: 1,
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

const RECEIVED_AT_BASE = Date.parse("2026-07-01T10:00:00.000Z");

describe("mergeIntervals / sumIntervalSeconds", () => {
  it("mescla intervalos sobrepostos e soma a duração total sem contar duplicado", () => {
    const merged = mergeIntervals([
      { startSeconds: 0, endSeconds: 300 },
      { startSeconds: 250, endSeconds: 600 },
      { startSeconds: 900, endSeconds: 950 },
    ]);

    expect(merged).toEqual([
      { startSeconds: 0, endSeconds: 600 },
      { startSeconds: 900, endSeconds: 950 },
    ]);
    expect(sumIntervalSeconds(merged)).toBe(650);
  });
});

describe("evaluateHeartbeat", () => {
  it("primeiro heartbeat de uma sessão nova só estabelece a base — não credita tempo/cobertura", () => {
    const result = evaluateHeartbeat({
      userId: "user-x",
      lessonId: "lesson-x",
      sessionId: "session-1",
      signal: { positionSeconds: 0, playing: true, tabVisible: true, playbackRate: 1, clientTimestamp: 1_000 },
      receivedAt: RECEIVED_AT_BASE,
      previousSession: null,
      canonicalDurationSeconds: CANONICAL_DURATION,
    });

    expect(result.addedValidSeconds).toBe(0);
    expect(result.newInterval).toBeNull();
    expect(result.flags).toEqual([]);
    expect(result.updatedSession.heartbeatCount).toBe(1);
    expect(result.updatedSession.lastPositionSeconds).toBe(0);
  });

  it("avanço plausível (playing+tabVisible, dentro do tempo real) cobre o intervalo e soma tempo válido", () => {
    const previous = baseSession({ lastPositionSeconds: 0, lastClientTimestamp: 1_000, coveredIntervals: [] });
    const receivedAt = RECEIVED_AT_BASE + 25_000; // +25s reais — dentro do limite de 30s

    const result = evaluateHeartbeat({
      userId: "user-x",
      lessonId: "lesson-x",
      sessionId: "session-1",
      signal: { positionSeconds: 25, playing: true, tabVisible: true, playbackRate: 1, clientTimestamp: 2_000 },
      receivedAt,
      previousSession: previous,
      canonicalDurationSeconds: CANONICAL_DURATION,
    });

    expect(result.flags).toEqual([]);
    expect(result.addedValidSeconds).toBe(25);
    expect(result.newInterval).toEqual({ startSeconds: 0, endSeconds: 25 });
    expect(result.updatedSession.coveredIntervals).toEqual([{ startSeconds: 0, endSeconds: 25 }]);
    expect(result.updatedSession.validSeconds).toBe(25);
  });

  it("heartbeat duplicado (mesmo clientTimestamp) é um no-op — não soma tempo nem cobertura", () => {
    const previous = baseSession({ lastPositionSeconds: 25, lastClientTimestamp: 2_000, validSeconds: 25 });
    const receivedAt = RECEIVED_AT_BASE + 25_000;

    const result = evaluateHeartbeat({
      userId: "user-x",
      lessonId: "lesson-x",
      sessionId: "session-1",
      signal: { positionSeconds: 50, playing: true, tabVisible: true, playbackRate: 1, clientTimestamp: 2_000 },
      receivedAt,
      previousSession: previous,
      canonicalDurationSeconds: CANONICAL_DURATION,
    });

    expect(result.flags).toEqual(["duplicate"]);
    expect(result.addedValidSeconds).toBe(0);
    expect(result.newInterval).toBeNull();
    expect(result.updatedSession.validSeconds).toBe(25); // inalterado
    expect(result.updatedSession.lastPositionSeconds).toBe(25); // inalterado
  });

  it("aba oculta (tabVisible=false) descarta o crédito, mesmo com posição avançando", () => {
    const previous = baseSession({ lastPositionSeconds: 25, lastClientTimestamp: 2_000, validSeconds: 25 });
    const receivedAt = RECEIVED_AT_BASE + 25_000;

    const result = evaluateHeartbeat({
      userId: "user-x",
      lessonId: "lesson-x",
      sessionId: "session-1",
      signal: { positionSeconds: 50, playing: true, tabVisible: false, playbackRate: 1, clientTimestamp: 3_000 },
      receivedAt,
      previousSession: previous,
      canonicalDurationSeconds: CANONICAL_DURATION,
    });

    expect(result.flags).toContain("tab_hidden");
    expect(result.addedValidSeconds).toBe(0);
    expect(result.newInterval).toBeNull();
    expect(result.updatedSession.validSeconds).toBe(25); // não soma
  });

  it("vídeo pausado (playing=false, aba visível) também descarta o crédito", () => {
    const previous = baseSession({ lastPositionSeconds: 25, lastClientTimestamp: 2_000, validSeconds: 25 });
    const receivedAt = RECEIVED_AT_BASE + 25_000;

    const result = evaluateHeartbeat({
      userId: "user-x",
      lessonId: "lesson-x",
      sessionId: "session-1",
      signal: { positionSeconds: 25, playing: false, tabVisible: true, playbackRate: 1, clientTimestamp: 3_000 },
      receivedAt,
      previousSession: previous,
      canonicalDurationSeconds: CANONICAL_DURATION,
    });

    expect(result.flags).toContain("not_playing");
    expect(result.addedValidSeconds).toBe(0);
  });

  it("intervalo excessivo entre heartbeats é limitado (gap_clamped), não descartado por completo", () => {
    const previous = baseSession({ lastPositionSeconds: 0, lastClientTimestamp: 1_000, validSeconds: 0 });
    const receivedAt = RECEIVED_AT_BASE + 10 * 60_000; // +10 min reais (bem acima do limite de 30s)

    const result = evaluateHeartbeat({
      userId: "user-x",
      lessonId: "lesson-x",
      sessionId: "session-1",
      signal: { positionSeconds: 20, playing: true, tabVisible: true, playbackRate: 1, clientTimestamp: 2_000 },
      receivedAt,
      previousSession: previous,
      canonicalDurationSeconds: CANONICAL_DURATION,
    });

    expect(result.flags).toContain("gap_clamped");
    expect(result.addedValidSeconds).toBe(30); // limitado a `heartbeatMaxGapSeconds`
  });

  it("delta pequeno enviado rápido demais (5s de vídeo em 1s real) é limitado ao tempo real (ALTO-1)", () => {
    const previous = baseSession({ lastPositionSeconds: 0, lastClientTimestamp: 1_000, validSeconds: 0 });
    const receivedAt = RECEIVED_AT_BASE + 1_000; // +1s real

    const result = evaluateHeartbeat({
      userId: "user-x",
      lessonId: "lesson-x",
      sessionId: "session-1",
      // Alega 5s de vídeo assistidos em apenas 1s real (o "free-pass" de positionJumpMinSeconds).
      signal: { positionSeconds: 5, playing: true, tabVisible: true, playbackRate: 1, clientTimestamp: 2_000 },
      receivedAt,
      previousSession: previous,
      canonicalDurationSeconds: CANONICAL_DURATION,
    });

    // Cobertura NÃO pode ser 5s — é limitada a maxPlausibleVideoDelta = 1s * 1x * 1.5 = 1.5s.
    expect(result.newInterval).not.toBeNull();
    expect(result.newInterval?.endSeconds).toBeCloseTo(1.5, 5);
    // Repetido a 1 hb/s, a cobertura cresce no MÁXIMO 1.5x o tempo de relógio real — nunca 5x.
  });

  it("vídeo tocando mas parado no mesmo ponto (sem avanço de posição) não credita tempo válido (MÉDIO-1)", () => {
    const previous = baseSession({ lastPositionSeconds: 100, lastClientTimestamp: 1_000, validSeconds: 50 });
    const receivedAt = RECEIVED_AT_BASE + 10_000; // +10s reais

    const result = evaluateHeartbeat({
      userId: "user-x",
      lessonId: "lesson-x",
      sessionId: "session-1",
      // playing=true, tabVisible=true, mas a posição não avançou (travado/buffer/frame em loop).
      signal: { positionSeconds: 100, playing: true, tabVisible: true, playbackRate: 1, clientTimestamp: 2_000 },
      receivedAt,
      previousSession: previous,
      canonicalDurationSeconds: CANONICAL_DURATION,
    });

    expect(result.newInterval).toBeNull();
    expect(result.addedValidSeconds).toBe(0); // tempo válido só acumula com avanço real
    expect(result.updatedSession.validSeconds).toBe(50); // inalterado
  });

  it("salto artificial de posição (avanço muito maior que o tempo real permitiria) é descartado", () => {
    const previous = baseSession({ lastPositionSeconds: 0, lastClientTimestamp: 1_000, validSeconds: 0 });
    const receivedAt = RECEIVED_AT_BASE + 10_000; // +10s reais

    const result = evaluateHeartbeat({
      userId: "user-x",
      lessonId: "lesson-x",
      sessionId: "session-1",
      // Alega ter assistido 1700s em apenas 10s reais — implausível mesmo com folga.
      signal: { positionSeconds: 1700, playing: true, tabVisible: true, playbackRate: 1, clientTimestamp: 2_000 },
      receivedAt,
      previousSession: previous,
      canonicalDurationSeconds: CANONICAL_DURATION,
    });

    expect(result.flags).toContain("position_jump_discarded");
    expect(result.newInterval).toBeNull();
    // A posição ainda é atualizada (para não repetir o mesmo salto a cada heartbeat seguinte).
    expect(result.updatedSession.lastPositionSeconds).toBe(1700);
  });

  it("playbackRate implausível é clampeado (rate_clamped) antes de validar o avanço", () => {
    const previous = baseSession({ lastPositionSeconds: 0, lastClientTimestamp: 1_000, validSeconds: 0 });
    const receivedAt = RECEIVED_AT_BASE + 10_000; // +10s reais

    const result = evaluateHeartbeat({
      userId: "user-x",
      lessonId: "lesson-x",
      sessionId: "session-1",
      // playbackRate=8x (fora do plausível, máx. configurado 2x) alegando 20s assistidos em 10s reais.
      signal: { positionSeconds: 20, playing: true, tabVisible: true, playbackRate: 8, clientTimestamp: 2_000 },
      receivedAt,
      previousSession: previous,
      canonicalDurationSeconds: CANONICAL_DURATION,
    });

    expect(result.flags).toContain("rate_clamped");
    // Com a taxa clampeada em 2x: 10s * 2 * 1.5 (tolerância) = 30s plausíveis — 20s passa.
    expect(result.newInterval).toEqual({ startSeconds: 0, endSeconds: 20 });
  });

  it("posição enviada além da duração canônica é limitada (clamp), nunca ultrapassa o catálogo", () => {
    const previous = baseSession({ lastPositionSeconds: 1_790, lastClientTimestamp: 1_000, validSeconds: 1_790 });
    const receivedAt = RECEIVED_AT_BASE + 20_000; // +20s reais — plausível para os 10s finais do vídeo

    const result = evaluateHeartbeat({
      userId: "user-x",
      lessonId: "lesson-x",
      sessionId: "session-1",
      signal: { positionSeconds: 5_000, playing: true, tabVisible: true, playbackRate: 1, clientTimestamp: 2_000 },
      receivedAt,
      previousSession: previous,
      canonicalDurationSeconds: CANONICAL_DURATION,
    });

    expect(result.updatedSession.lastPositionSeconds).toBe(CANONICAL_DURATION);
  });
});
