import type {
  FocusSessionCreateInput,
  FocusSessionEntity,
  FocusSessionRepository,
} from "../contracts/focus-session-repository";
import { mockStore } from "./mock-store";

/**
 * Implementação mock — em memória de processo (ADR-0011), sem seed inicial (uma sessão só nasce
 * quando o aluno inicia o Modo Foco). Mesmo padrão de `MockStudySessionRepository`/
 * `MockStudyMissionRepository`. Estado via `mockStore` (`./mock-store.ts`) — compartilhado
 * entre instâncias de módulo (Next.js 16/Turbopack): sem isso, `POST /api/focus/heartbeat`
 * (Route Handler) não enxergava a sessão recém-criada por `startFocusSessionAction` (Server
 * Action) quando as duas fronteiras caíam em instâncias de módulo separadas.
 */
const store = mockStore<FocusSessionEntity[]>("focus-session", () => []);
const sequence = mockStore<{ value: number }>("focus-session:sequence", () => ({ value: 0 }));

export class MockFocusSessionRepository implements FocusSessionRepository {
  async findById(userId: string, id: string): Promise<FocusSessionEntity | null> {
    return store.find((session) => session.id === id && session.userId === userId) ?? null;
  }

  async findActiveByUserId(userId: string): Promise<FocusSessionEntity | null> {
    return store.find((session) => session.userId === userId && session.status === "ACTIVE") ?? null;
  }

  async create(input: FocusSessionCreateInput): Promise<FocusSessionEntity> {
    sequence.value += 1;
    const nowIso = input.now.toISOString();
    const session: FocusSessionEntity = {
      id: `focus-session-mock-${sequence.value}`,
      userId: input.userId,
      mode: input.mode,
      status: "ACTIVE",
      targetSeconds: input.targetSeconds,
      breakSeconds: input.breakSeconds,
      subjectId: input.subjectId,
      topicId: input.topicId,
      objective: input.objective,
      startedAt: nowIso,
      endedAt: null,
      lastHeartbeatAt: nowIso,
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
      updatedAt: nowIso,
    };
    store.push(session);
    return session;
  }

  async save(entity: FocusSessionEntity): Promise<FocusSessionEntity> {
    const index = store.findIndex((session) => session.id === entity.id);
    if (index === -1) {
      store.push(entity);
    } else {
      store[index] = entity;
    }
    return entity;
  }
}

/** Uso exclusivo de testes — limpa todo o store em memória. */
export function __resetMockFocusSessionStore(): void {
  store.splice(0, store.length);
  sequence.value = 0;
}
