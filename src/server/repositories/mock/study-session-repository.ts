import type {
  StudySessionEntity,
  StudySessionRepository,
} from "../contracts/study-session-repository";
import { mockStore } from "./mock-store";

/**
 * Implementação mock — em memória de processo (ADR-0011), sem seed inicial (sessões nascem
 * do primeiro heartbeat de cada aluno/aula). Mesma limitação de todo mock mutável deste
 * projeto (`MockEnrollmentRepository`, `MockLessonProgressRepository`): não sobrevive a
 * reinícios do processo. Estado via `mockStore` (`./mock-store.ts`) — compartilhado entre
 * instâncias de módulo dentro do MESMO processo (Next.js 16/Turbopack); ainda não sobrevive a
 * reinícios nem é compartilhado entre processos distintos.
 */
const store = mockStore<Map<string, StudySessionEntity>>("study-session", () => new Map());

function key(userId: string, lessonId: string, sessionId: string): string {
  return `${userId}:${lessonId}:${sessionId}`;
}

export class MockStudySessionRepository implements StudySessionRepository {
  async findSession(
    userId: string,
    lessonId: string,
    sessionId: string,
  ): Promise<StudySessionEntity | null> {
    return store.get(key(userId, lessonId, sessionId)) ?? null;
  }

  async saveSession(entity: StudySessionEntity): Promise<StudySessionEntity> {
    store.set(key(entity.userId, entity.lessonId, entity.id), entity);
    return entity;
  }

  async listSessionsByUserAndLesson(userId: string, lessonId: string): Promise<StudySessionEntity[]> {
    return [...store.values()].filter(
      (session) => session.userId === userId && session.lessonId === lessonId,
    );
  }

  async listRecentSessionsByUserId(userId: string, sinceIso: string): Promise<StudySessionEntity[]> {
    return [...store.values()].filter(
      (session) => session.userId === userId && session.lastHeartbeatAt >= sinceIso,
    );
  }
}

/** Uso exclusivo de testes — limpa todo o store em memória. */
export function __resetMockStudySessionStore(): void {
  store.clear();
}
