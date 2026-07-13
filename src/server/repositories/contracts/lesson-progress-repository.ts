/**
 * Status de progresso de uma aula para um aluno (`LessonProgress`, docs/DATA-MODEL.md).
 *
 * FRONTEIRA DE DOMÍNIO (crítico): a fonte de verdade de "quando" uma aula passa a
 * `completed` (≥ `LESSON_COMPLETION_MIN_PERCENT`, CLAUDE.md §12/§13) é o agente
 * `study-tracking`, a partir de heartbeats de vídeo — nunca recalculada aqui. Este
 * repositório só LÊ o status já registrado; a Fase 6 (`backend`/cursos) consome esse
 * status para liberação sequencial e progresso agregado, sem recalcular tempo assistido.
 */
export type LessonProgressStatus = "not_started" | "in_progress" | "completed";

export interface LessonProgressEntity {
  id: string;
  userId: string;
  lessonId: string;
  status: LessonProgressStatus;
  /** Fração 0–1 (não percentual 0–100 — ver docs/DATA-MODEL.md, "convenção de escala"). */
  watchedPercent: number;
  /** ISO 8601, ou `null` enquanto não concluída. */
  completedAt: string | null;
  /** ISO 8601 — última atualização do registro. */
  updatedAt: string;
}

/** Entrada de escrita — exclusiva do agente `study-tracking` (Fase 7), a partir do tempo/posição
 *  já reconstruídos no servidor (heartbeat). Nunca aceitar estes valores vindos do cliente. */
export interface LessonProgressUpsertInput {
  userId: string;
  lessonId: string;
  status: LessonProgressStatus;
  /** Fração 0–1 (ver docs/DATA-MODEL.md, "convenção de escala"). */
  watchedPercent: number;
  /** ISO 8601, ou `null` enquanto não concluída. */
  completedAt: string | null;
}

/** Abstração de persistência para progresso de aula (ADR-0002). */
export interface LessonProgressRepository {
  findByUserAndLesson(userId: string, lessonId: string): Promise<LessonProgressEntity | null>;
  /** Todos os registros de progresso do usuário (o service filtra pelo curso de interesse). */
  listByUserId(userId: string): Promise<LessonProgressEntity[]>;
  /**
   * Grava (cria ou atualiza) o progresso de uma aula — escrita exclusiva do `study-tracking`
   * (Fase 7). Idempotente por `(userId, lessonId)`: chamar de novo com os mesmos valores não
   * duplica registro (mesma garantia de `LessonProgress @@unique([userId, lessonId])`,
   * docs/DATA-MODEL.md).
   */
  upsert(input: LessonProgressUpsertInput): Promise<LessonProgressEntity>;
}
