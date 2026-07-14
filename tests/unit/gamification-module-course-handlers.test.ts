import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por `@/server/authorization`).
const { recordHeartbeat } = await import("@/server/services/study-tracking");
const { __resetHeartbeatRateLimitStore } = await import("@/server/services/study-tracking/rate-limit");
const { __resetMockLessonProgressStore } = await import(
  "@/server/repositories/mock/lesson-progress-repository"
);
const { __resetMockStudySessionStore } = await import(
  "@/server/repositories/mock/study-session-repository"
);
const { __resetMockGamificationEventStore } = await import(
  "@/server/repositories/mock/gamification-event-repository"
);
const { __resetMockPointTransactionStore } = await import(
  "@/server/repositories/mock/point-transaction-repository"
);
const { __resetMockUserAchievementStore } = await import(
  "@/server/repositories/mock/user-achievement-repository"
);
const { getRepositories } = await import("@/server/repositories");

/**
 * Testes de integração do disparo de `ModuleCompleted` no PONTO real de conclusão
 * (Fase 8 — CLAUDE.md §15/§25), coordenado com `study-tracking/record-heartbeat.ts`:
 * concluir a última aula pendente de um módulo credita os 500 pontos do módulo exatamente
 * uma vez — nunca de novo em chamadas seguintes.
 *
 * `CourseCompleted` usa a MESMA lógica de detecção (comparação de percentual antes/depois de
 * `computeProgressForCourse`, ver `record-heartbeat.ts`) aplicada a `courseProgressPercent`
 * em vez de `moduleAfter.progressPercent` — não é exercitado ponta a ponta aqui porque o
 * curso mock tem 6 módulos × 4 aulas (24 aulas), custoso demais para um teste unitário;
 * fica registrado como pendência de um teste de integração mais amplo (ex.: `tests/e2e`).
 */
function fakeSession(id: string): NextAuthSession {
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

const BASE_TIME = Date.parse("2026-07-13T10:00:00.000Z");
const TICK_SECONDS = 25;
const RATE = 2;
const STEP_SECONDS = TICK_SECONDS * RATE;

interface HeartbeatOverrides {
  lessonId: string;
  sessionId?: string;
  positionSeconds?: number;
  durationSeconds?: number;
  playing?: boolean;
  tabVisible?: boolean;
  playbackRate?: number;
  clientTimestamp?: number;
}

function heartbeat(overrides: HeartbeatOverrides) {
  return {
    sessionId: overrides.sessionId ?? `session-${overrides.lessonId}`,
    positionSeconds: overrides.positionSeconds ?? 0,
    durationSeconds: overrides.durationSeconds ?? 1_800,
    playing: overrides.playing ?? true,
    tabVisible: overrides.tabVisible ?? true,
    playbackRate: overrides.playbackRate ?? 1,
    clientTimestamp: overrides.clientTimestamp ?? 1,
    ...overrides,
  };
}

/**
 * Relógio falso MONOTÔNICO compartilhado entre todas as aulas de um teste — nunca anda para
 * trás. Necessário porque `completeLesson` é chamado várias vezes em sequência (uma aula após
 * a outra) e o rate limit leve (`checkHeartbeatRateLimit`) rejeitaria a próxima chamada se o
 * relógio retrocedesse (intervalo "negativo" sempre menor que o mínimo exigido).
 */
let clockMs = BASE_TIME;

/**
 * Conclui uma aula (>=80% assistido) avançando o relógio falso em ticks realistas. O nº de
 * ticks é derivado da duração REAL da aula no catálogo (cada aula do módulo 1 tem uma
 * duração diferente — 25 a 35 min) — nunca um valor fixo, senão aulas mais longas que
 * "Interpretação de texto" (30 min) nunca cruzariam os 80% exigidos.
 */
async function completeLesson(userId: string, lessonId: string): Promise<void> {
  const lesson = await getRepositories().lessons.findById(lessonId);
  if (!lesson) {
    throw new Error(`Fixture inválida: aula "${lessonId}" não encontrada no catálogo mock.`);
  }
  const durationSeconds = lesson.durationMinutes * 60;
  const ticksNeeded = Math.ceil((0.8 * durationSeconds) / STEP_SECONDS);

  await recordHeartbeat(userId, heartbeat({ lessonId, positionSeconds: 0, clientTimestamp: 1 }));
  for (let i = 1; i <= ticksNeeded; i += 1) {
    clockMs += TICK_SECONDS * 1_000;
    vi.setSystemTime(clockMs);
    await recordHeartbeat(
      userId,
      heartbeat({
        lessonId,
        positionSeconds: i * STEP_SECONDS,
        playbackRate: RATE,
        clientTimestamp: i + 1,
      }),
    );
  }
}

describe("gamification — ModuleCompleted disparado no ponto real de conclusão", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockLessonProgressStore();
    __resetMockStudySessionStore();
    __resetMockGamificationEventStore();
    __resetMockPointTransactionStore();
    __resetMockUserAchievementStore();
    __resetHeartbeatRateLimitStore();
    clockMs = BASE_TIME;
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("concluir a última aula do módulo credita os 500 pontos do módulo exatamente uma vez", async () => {
    const userId = "mod-complete-user";
    authMock.mockResolvedValue(fakeSession(userId));
    await getRepositories().enrollments.create({ userId, courseId: "course-1" });

    // Módulo 1 do course-1 (lingua-portuguesa) tem 4 aulas: course-1-m1-l1..l4.
    await completeLesson(userId, "course-1-m1-l1");
    await completeLesson(userId, "course-1-m1-l2");
    await completeLesson(userId, "course-1-m1-l3");
    await completeLesson(userId, "course-1-m1-l4");

    const repos = getRepositories();
    const finalProgress = await repos.lessonProgress.findByUserAndLesson(userId, "course-1-m1-l4");
    expect(finalProgress?.status).toBe("completed");

    const events = await repos.gamificationEvents.listByUserId(userId);
    const moduleEvents = events.filter((event) => event.type === "MODULE_COMPLETED");
    expect(moduleEvents).toHaveLength(1);
    expect(moduleEvents[0]?.points).toBe(500);

    const { points } = await repos.pointTransactions.sumByUserId(userId);
    // 4 aulas x 100 + 1 módulo x 500 = 900.
    expect(points).toBe(900);
  });

  it("heartbeats adicionais após o módulo já concluído não pontuam de novo", async () => {
    const userId = "mod-complete-repeat-user";
    authMock.mockResolvedValue(fakeSession(userId));
    await getRepositories().enrollments.create({ userId, courseId: "course-1" });

    await completeLesson(userId, "course-1-m1-l1");
    await completeLesson(userId, "course-1-m1-l2");
    await completeLesson(userId, "course-1-m1-l3");
    await completeLesson(userId, "course-1-m1-l4");

    const repos = getRepositories();
    const { points: pointsAfterFirstCompletion } = await repos.pointTransactions.sumByUserId(userId);

    // Mais heartbeats na última aula, já concluída — não deve gerar novo crédito de módulo.
    clockMs += 10_000_000;
    vi.setSystemTime(clockMs);
    await recordHeartbeat(
      userId,
      heartbeat({ lessonId: "course-1-m1-l4", positionSeconds: 1_800, clientTimestamp: 1_000 }),
    );

    const { points: pointsAfterExtraHeartbeat } = await repos.pointTransactions.sumByUserId(userId);
    expect(pointsAfterExtraHeartbeat).toBe(pointsAfterFirstCompletion);

    const moduleEvents = (await repos.gamificationEvents.listByUserId(userId)).filter(
      (event) => event.type === "MODULE_COMPLETED",
    );
    expect(moduleEvents).toHaveLength(1);
  });
});
