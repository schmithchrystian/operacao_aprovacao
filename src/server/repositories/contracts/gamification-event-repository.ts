/**
 * Evento de gamificação (`GamificationEvent`, `prisma/schema.prisma`) — padrão outbox
 * (ADR-0007). Cada linha representa UM fato de origem já processado (ou rejeitado) pelo
 * motor de gamificação (`src/server/services/gamification/engine.ts`).
 *
 * `type` espelha o enum Prisma `GamificationEventType` — mantenha os dois sincronizados.
 */
export type GamificationEventType =
  | "LESSON_COMPLETED"
  | "MODULE_COMPLETED"
  | "COURSE_COMPLETED"
  | "FLASHCARD_CORRECT"
  | "POMODORO_COMPLETED"
  | "MOCK_EXAM_COMPLETED"
  | "QUESTION_CORRECT"
  | "DAILY_GOAL_COMPLETED"
  | "WEEKLY_GOAL_COMPLETED"
  | "STREAK_7"
  | "STREAK_30"
  | "MANUAL_ADJUSTMENT";

/** Espelha o enum Prisma `GamificationEventStatus`. */
export type GamificationEventStatus = "PENDING" | "PROCESSED" | "FAILED" | "SKIPPED";

export interface GamificationEventEntity {
  id: string;
  userId: string;
  type: GamificationEventType;
  /** Padrão `<tipo>:<userId>:<entidadeId>` (CLAUDE.md §15/§25) — única no repositório. */
  idempotencyKey: string;
  sourceType: string;
  sourceId: string | null;
  points: number;
  xp: number;
  /** Versão de `GAMIFICATION_REWARDS` vigente no momento do cálculo (`config/business.ts`). */
  ruleVersion: number;
  context: Record<string, unknown> | null;
  status: GamificationEventStatus;
  createdAt: string;
}

export interface GamificationEventCreateInput {
  userId: string;
  type: GamificationEventType;
  idempotencyKey: string;
  sourceType: string;
  sourceId: string | null;
  points: number;
  xp: number;
  ruleVersion: number;
  status: GamificationEventStatus;
  context?: Record<string, unknown>;
  /** Relógio injetado pelo chamador (engine) — nunca `Date.now()` direto em código puro. */
  now: Date;
}

/** Abstração de persistência do ledger de eventos de gamificação (ADR-0002). */
export interface GamificationEventRepository {
  findByIdempotencyKey(key: string): Promise<GamificationEventEntity | null>;
  /**
   * Cria o evento. IDEMPOTENTE: se já existir uma linha com a mesma `idempotencyKey`, a
   * implementação deve devolvê-la sem criar uma segunda (constraint única real no Prisma;
   * checagem explícita no mock).
   */
  create(input: GamificationEventCreateInput): Promise<GamificationEventEntity>;
  listByUserId(userId: string): Promise<GamificationEventEntity[]>;
}
