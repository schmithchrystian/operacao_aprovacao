/**
 * Sessão de estudo de vídeo (`StudySession`/`StudyActivity`, docs/DATA-MODEL.md) — Fase 7
 * (agente `study-tracking`). Escopo aqui é só `source: "LESSON"` (heartbeat de vídeo); os
 * demais `StudySessionSource` (POMODORO/FLASHCARD/SIMULATION/FREE) ficam para fases futuras.
 *
 * FRONTEIRA CRÍTICA (CLAUDE.md §14): este repositório é uma abstração de PERSISTÊNCIA pura —
 * não decide o que é "tempo válido". A reconstrução (heartbeats descartados/limitados, saltos
 * artificiais, sessões simultâneas) é feita no serviço
 * (`src/server/services/study-tracking/heartbeat-evaluator.ts`); aqui só se grava/lê o estado
 * já avaliado.
 *
 * LIMITAÇÃO CONHECIDA DO MOCK: o schema Prisma real guarda cada heartbeat como uma linha
 * `StudyActivity` (append-only, auditável). O mock, por simplicidade, guarda apenas o estado
 * AGREGADO da sessão (última posição, intervalos cobertos, tempo válido acumulado) — não o
 * histórico bruto de cada heartbeat. `PrismaStudySessionRepository` deve reconciliar isso ao
 * ser implementado (agregar `StudyActivity` em `StudySession.validSeconds` numa transação).
 */
export type StudySessionSource = "LESSON";
export type StudySessionStatus = "ACTIVE" | "FINISHED" | "DISCARDED";

/** Trecho (em segundos) do vídeo já coberto por reprodução validada. */
export interface CoveredInterval {
  startSeconds: number;
  endSeconds: number;
}

export interface StudySessionEntity {
  /** Igual ao `sessionId` enviado pelo player (client) — único por `(userId, lessonId)`. */
  id: string;
  userId: string;
  lessonId: string;
  source: StudySessionSource;
  status: StudySessionStatus;
  /** ISO 8601 — horário do SERVIDOR no primeiro heartbeat aceito desta sessão. */
  startedAt: string;
  /** ISO 8601 — horário do SERVIDOR no último heartbeat aceito. */
  lastHeartbeatAt: string;
  /** Última posição (segundos) aceita/limitada pelo servidor (nunca o valor cru do cliente). */
  lastPositionSeconds: number;
  /** `clientTimestamp` do último heartbeat — usado só para detectar duplicidade exata. */
  lastClientTimestamp: number;
  /** União de trechos do vídeo já cobertos por reprodução válida (para `watchedPercent`). */
  coveredIntervals: CoveredInterval[];
  /** Tempo válido (segundos) acumulado nesta sessão (CLAUDE.md §14) — nunca `fim - início` bruto. */
  validSeconds: number;
  heartbeatCount: number;
  updatedAt: string;
}

/** Abstração de persistência para sessões de estudo de vídeo (ADR-0002). */
export interface StudySessionRepository {
  findSession(userId: string, lessonId: string, sessionId: string): Promise<StudySessionEntity | null>;
  /** Grava (cria ou atualiza) o estado agregado da sessão. */
  saveSession(entity: StudySessionEntity): Promise<StudySessionEntity>;
  /** Todas as sessões (de qualquer dia) do usuário para uma aula — usado para reconstruir
   *  `watchedPercent` a partir da união de intervalos cobertos entre sessões. */
  listSessionsByUserAndLesson(userId: string, lessonId: string): Promise<StudySessionEntity[]>;
  /** Sessões do usuário (qualquer aula) com heartbeat recente — usado para detectar sessões
   *  simultâneas suspeitas (CLAUDE.md §14). */
  listRecentSessionsByUserId(userId: string, sinceIso: string): Promise<StudySessionEntity[]>;
}
