import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por `@/server/authorization`).
const { recordHeartbeat, getLessonView } = await import("@/server/services/study-tracking");
const { __resetHeartbeatRateLimitStore } = await import(
  "@/server/services/study-tracking/rate-limit"
);
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

/** Atalho de teste — lista as transações de pontos do usuário (ledger real, Fase 8). */
async function listPointTransactionsByUserId(userId: string) {
  return getRepositories().pointTransactions.listByUserId(userId);
}

/**
 * Testes de serviço da Fase 7 (`study-tracking`) — CLAUDE.md §13/§14/§25. Cobrem os cenários
 * mínimos exigidos: conclusão por percentual, idempotência de pontuação, descarte de aba
 * oculta/heartbeat duplicado/salto artificial, ignorar percentual/tempo do cliente, aula
 * bloqueada, rate limit leve e sessão simultânea suspeita.
 *
 * Usa relógio falso (`vi.setSystemTime`) para controlar o tempo REAL decorrido entre
 * heartbeats — a fonte de verdade do serviço é o relógio do servidor, nunca `clientTimestamp`.
 * Cada teste usa um `userId` sintético próprio (nunca reaproveitado) para não colidir com a
 * idempotência do `EventBus`/`GamificationEvent`, que não é resetada entre testes (por design
 * — simula o comportamento real de "nunca reprocessar o mesmo fato").
 */

function fakeSession(id: string): NextAuthSession {
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

// "Interpretação de texto" (course-1, módulo 1, aula 1) — 30 min = 1800s. Sempre disponível
// (Regra 1 de `computeCourseProgress`), então serve de base "limpa" para qualquer userId novo.
const LESSON_ID = "course-1-m1-l1";
const DURATION_SECONDS = 1800;
const BASE_TIME = Date.parse("2026-07-13T10:00:00.000Z");

interface HeartbeatOverrides {
  lessonId?: string;
  sessionId?: string;
  positionSeconds?: number;
  durationSeconds?: number;
  playing?: boolean;
  tabVisible?: boolean;
  playbackRate?: number;
  clientTimestamp?: number;
}

function heartbeat(overrides: HeartbeatOverrides = {}) {
  return {
    lessonId: overrides.lessonId ?? LESSON_ID,
    sessionId: overrides.sessionId ?? "session-1",
    positionSeconds: overrides.positionSeconds ?? 0,
    durationSeconds: overrides.durationSeconds ?? DURATION_SECONDS,
    playing: overrides.playing ?? true,
    tabVisible: overrides.tabVisible ?? true,
    playbackRate: overrides.playbackRate ?? 1,
    clientTimestamp: overrides.clientTimestamp ?? 1,
  };
}

/** Matricula o usuário no curso (idempotente no mock) — pré-condição de segurança da Fase 7:
 *  sem matrícula ativa, `recordHeartbeat`/`getLessonView` recusam (ALTO-2). */
async function enrollUser(userId: string, courseId = "course-1"): Promise<void> {
  await getRepositories().enrollments.create({ userId, courseId });
}

// Cadência REALISTA de heartbeat: intervalo real (`TICK_SECONDS`) sempre dentro do limite
// configurado (`STUDY_TRACKING.heartbeatMaxGapSeconds` = 30s) — heartbeats espaçados demais
// (ex.: minutos) seriam corretamente limitados pelo servidor (`gap_clamped`), o que não é o
// que estes testes de progresso querem exercitar. `RATE` = velocidade máxima plausível (2x),
// para simular avanço de vídeo real sem precisar de centenas de iterações.
const TICK_SECONDS = 25;
const RATE = 2;
const STEP_SECONDS = TICK_SECONDS * RATE; // 50s de vídeo "assistido" por tick.

/** Simula `ticks` heartbeats sucessivos (após o heartbeat inicial de baseline), avançando o
 *  relógio falso a cada chamada. Devolve o resultado da última chamada. */
async function driveWatchTicks(
  userId: string,
  ticks: number,
  overrides: Pick<HeartbeatOverrides, "lessonId" | "sessionId"> = {},
) {
  await enrollUser(userId, "course-1");
  await recordHeartbeat(userId, heartbeat({ ...overrides, positionSeconds: 0, clientTimestamp: 1 }));

  let lastResult;
  for (let i = 1; i <= ticks; i += 1) {
    vi.setSystemTime(BASE_TIME + i * TICK_SECONDS * 1_000);
    lastResult = await recordHeartbeat(
      userId,
      heartbeat({
        ...overrides,
        positionSeconds: i * STEP_SECONDS,
        playbackRate: RATE,
        clientTimestamp: i + 1,
      }),
    );
  }
  return lastResult;
}

describe("services/study-tracking — recordHeartbeat (Fase 7)", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockLessonProgressStore();
    __resetMockStudySessionStore();
    __resetMockGamificationEventStore();
    __resetMockPointTransactionStore();
    __resetMockUserAchievementStore();
    __resetHeartbeatRateLimitStore();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aula abaixo de 80% assistido não conclui nem pontua", async () => {
    const userId = "hb-below-80";
    authMock.mockResolvedValue(fakeSession(userId));

    // 18 ticks * 50s = 900s cobertos de 1800s = 50%.
    const result = await driveWatchTicks(userId, 18);

    expect(result?.justCompleted).toBe(false);
    expect(result?.status).not.toBe("completed");
    expect(result?.watchedPercent).toBeCloseTo(50, 0);
    expect(await listPointTransactionsByUserId(userId)).toHaveLength(0);
  });

  it("aula com >=80% assistido conclui e credita pontos via evento LessonCompleted", async () => {
    const userId = "hb-completes";
    authMock.mockResolvedValue(fakeSession(userId));

    // 29 ticks * 50s = 1450s cobertos de 1800s ≈ 80,6%.
    const lastResult = await driveWatchTicks(userId, 29);

    expect(lastResult?.justCompleted).toBe(true);
    expect(lastResult?.status).toBe("completed");
    expect(lastResult?.watchedPercent).toBeGreaterThanOrEqual(80);
    expect(lastResult?.completion).not.toBeNull();
    expect(lastResult?.completion?.points).toBe(100);
    expect(lastResult?.completion?.xp).toBe(100);

    const progress = await getRepositories().lessonProgress.findByUserAndLesson(userId, LESSON_ID);
    expect(progress?.status).toBe("completed");
    expect(await listPointTransactionsByUserId(userId)).toHaveLength(1);
  });

  it("mesma aula não pontua/conclui duas vezes (idempotência)", async () => {
    const userId = "hb-idempotent";
    authMock.mockResolvedValue(fakeSession(userId));

    await driveWatchTicks(userId, 29);
    expect(await listPointTransactionsByUserId(userId)).toHaveLength(1);

    // Mais um heartbeat após já concluída — não deve pontuar/"concluir" de novo.
    vi.setSystemTime(BASE_TIME + 30 * TICK_SECONDS * 1_000);
    const result = await recordHeartbeat(
      userId,
      heartbeat({ positionSeconds: 1_800, playbackRate: RATE, clientTimestamp: 31 }),
    );

    expect(result.justCompleted).toBe(false);
    expect(result.completion).toBeNull();
    expect(await listPointTransactionsByUserId(userId)).toHaveLength(1);
  });

  it("tempo com aba oculta é descartado — não soma progresso", async () => {
    const userId = "hb-hidden-tab";
    authMock.mockResolvedValue(fakeSession(userId));
    await enrollUser(userId);

    await recordHeartbeat(userId, heartbeat({ positionSeconds: 0, clientTimestamp: 1 }));
    vi.setSystemTime(BASE_TIME + 25_000);
    const result = await recordHeartbeat(
      userId,
      heartbeat({ positionSeconds: 25, tabVisible: false, clientTimestamp: 2 }),
    );

    expect(result.flags).toContain("tab_hidden");
    expect(result.watchedPercent).toBe(0);
  });

  it("heartbeat duplicado (mesmo clientTimestamp) não soma tempo/progresso", async () => {
    const userId = "hb-duplicate";
    authMock.mockResolvedValue(fakeSession(userId));
    await enrollUser(userId);

    await recordHeartbeat(userId, heartbeat({ positionSeconds: 0, clientTimestamp: 1 }));
    vi.setSystemTime(BASE_TIME + 25_000);
    const first = await recordHeartbeat(userId, heartbeat({ positionSeconds: 25, clientTimestamp: 2 }));

    vi.setSystemTime(BASE_TIME + 50_000);
    const second = await recordHeartbeat(
      userId,
      heartbeat({ positionSeconds: 50, clientTimestamp: 2 }), // mesmo clientTimestamp da chamada anterior
    );

    expect(second.flags).toContain("duplicate");
    expect(second.watchedPercent).toBe(first.watchedPercent);
    expect(first.watchedPercent).toBeGreaterThan(0); // garante que o teste exercita cobertura real, não 0 acidental
  });

  it("salto artificial de posição não conta como assistido", async () => {
    const userId = "hb-jump";
    authMock.mockResolvedValue(fakeSession(userId));
    await enrollUser(userId);

    await recordHeartbeat(userId, heartbeat({ positionSeconds: 0, clientTimestamp: 1 }));
    vi.setSystemTime(BASE_TIME + 10_000); // +10s reais
    const result = await recordHeartbeat(
      userId,
      heartbeat({ positionSeconds: 1700, clientTimestamp: 2 }), // alega 1700s assistidos em 10s reais
    );

    expect(result.flags).toContain("position_jump_discarded");
    expect(result.watchedPercent).toBe(0);
    expect(result.status).not.toBe("completed");
  });

  it("percentual/tempo enviado pelo cliente é ignorado — servidor recomputa pela duração do catálogo", async () => {
    const userId = "hb-client-override";
    authMock.mockResolvedValue(fakeSession(userId));
    await enrollUser(userId);

    await recordHeartbeat(userId, heartbeat({ positionSeconds: 0, clientTimestamp: 1 }));
    vi.setSystemTime(BASE_TIME + 25_000);
    // Cliente alega uma duração total de só 10s (tentando inflar o percentual) — ignorado.
    const result = await recordHeartbeat(userId, heartbeat({ positionSeconds: 25, durationSeconds: 10, clientTimestamp: 2 }));

    // Se o servidor usasse a duração do cliente (10s), 25s assistidos dariam 250%. Usando a
    // duração canônica do catálogo (1800s), o percentual real é ~1,4%.
    expect(result.watchedPercent).toBeCloseTo((25 / 1800) * 100, 0);
    expect(result.status).not.toBe("completed");
  });

  it("aula bloqueada não pode registrar progresso (mesmo matriculado)", async () => {
    const userId = "hb-locked";
    authMock.mockResolvedValue(fakeSession(userId));
    await enrollUser(userId); // matriculado — falha deve vir do bloqueio da aula, não da matrícula.

    // 2ª aula do módulo 1 — bloqueada enquanto a 1ª não é concluída por este usuário.
    await expect(
      recordHeartbeat(userId, heartbeat({ lessonId: "course-1-m1-l2", clientTimestamp: 1 })),
    ).rejects.toThrow();
  });

  it("usuário NÃO matriculado não vê progresso nem pontua (ALTO-2)", async () => {
    const userId = "hb-not-enrolled";
    authMock.mockResolvedValue(fakeSession(userId));
    // Sem `enrollUser` — a 1ª aula é sempre `available`, mas a matrícula é obrigatória.

    await expect(
      recordHeartbeat(userId, heartbeat({ positionSeconds: 0, clientTimestamp: 1 })),
    ).rejects.toThrow();

    // Nada foi gravado: nem progresso, nem pontos, nem sessão de estudo.
    const progress = await getRepositories().lessonProgress.findByUserAndLesson(userId, LESSON_ID);
    expect(progress).toBeNull();
    expect(await listPointTransactionsByUserId(userId)).toHaveLength(0);
    const sessions = await getRepositories().studySessions.listSessionsByUserAndLesson(userId, LESSON_ID);
    expect(sessions).toHaveLength(0);
  });

  it("rate limit leve rejeita heartbeats enviados com frequência excessiva", async () => {
    const userId = "hb-rate-limited";
    authMock.mockResolvedValue(fakeSession(userId));
    await enrollUser(userId);

    await recordHeartbeat(userId, heartbeat({ positionSeconds: 0, clientTimestamp: 1 }));
    // Sem avançar o relógio — heartbeat imediatamente em seguida deve ser limitado.
    await expect(
      recordHeartbeat(userId, heartbeat({ positionSeconds: 5, clientTimestamp: 2 })),
    ).rejects.toThrow();
  });

  it("sessão simultânea suspeita tem o crédito de tempo/progresso descartado", async () => {
    const userId = "hb-concurrent";
    authMock.mockResolvedValue(fakeSession(userId));
    await enrollUser(userId, "course-2");
    await enrollUser(userId, "course-3");

    // Sessão A: aula "course-2-m1-l1" (também sempre disponível).
    await recordHeartbeat(
      userId,
      heartbeat({ lessonId: "course-2-m1-l1", sessionId: "session-a", positionSeconds: 0, clientTimestamp: 1 }),
    );

    vi.setSystemTime(BASE_TIME + 2_000);
    // Sessão B: aula "course-3-m1-l1" (também sempre disponível) — heartbeat próximo no tempo real.
    await recordHeartbeat(
      userId,
      heartbeat({ lessonId: "course-3-m1-l1", sessionId: "session-b", positionSeconds: 0, clientTimestamp: 1 }),
    );

    // Novo heartbeat da sessão A pouco depois — a sessão B (outra aula) ainda está "recente"
    // (dentro da janela de sessões simultâneas), então o crédito desta chamada é descartado.
    vi.setSystemTime(BASE_TIME + 8_000);
    const result = await recordHeartbeat(
      userId,
      heartbeat({ lessonId: "course-2-m1-l1", sessionId: "session-a", positionSeconds: 6, clientTimestamp: 2 }),
    );

    expect(result.flags).toContain("concurrent_session_suspected");
    expect(result.watchedPercent).toBe(0);
  });
});

describe("services/study-tracking — getLessonView (Fase 7)", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockLessonProgressStore();
    __resetMockStudySessionStore();
  });

  it("retorna os dados da aula disponível, com a próxima aula do módulo e nenhuma anterior", async () => {
    const userId = "lv-fresh-user";
    authMock.mockResolvedValue(fakeSession(userId));
    await enrollUser(userId);

    const view = await getLessonView(userId, "pm-soldado", "lingua-portuguesa", LESSON_ID);

    expect(view.lessonId).toBe(LESSON_ID);
    expect(view.locked).toBe(false);
    expect(view.status).toBe("available");
    expect(view.previousLesson).toBeNull();
    expect(view.nextLesson?.lessonId).toBe("course-1-m1-l2");
  });

  it("lança ForbiddenError ao ver a aula sem matrícula ativa (ALTO-2)", async () => {
    const userId = "lv-not-enrolled";
    authMock.mockResolvedValue(fakeSession(userId));
    // Sem `enrollUser` — mesmo a 1ª aula (`available`) não pode ser exposta sem matrícula.

    await expect(
      getLessonView(userId, "pm-soldado", "lingua-portuguesa", LESSON_ID),
    ).rejects.toThrow();
  });

  it("lança erro ao tentar ver uma aula ainda bloqueada", async () => {
    const userId = "lv-locked-user";
    authMock.mockResolvedValue(fakeSession(userId));
    await enrollUser(userId);

    await expect(
      getLessonView(userId, "pm-soldado", "lingua-portuguesa", "course-1-m1-l2"),
    ).rejects.toThrow();
  });

  it("lança NotFoundError quando a aula não pertence ao módulo/curso do path (anti-IDOR)", async () => {
    const userId = "lv-idor-user";
    authMock.mockResolvedValue(fakeSession(userId));
    await enrollUser(userId);

    // "course-1-m1-l1" pertence ao módulo "lingua-portuguesa", não a "raciocinio-logico".
    await expect(
      getLessonView(userId, "pm-soldado", "raciocinio-logico", LESSON_ID),
    ).rejects.toThrow();
  });
});
