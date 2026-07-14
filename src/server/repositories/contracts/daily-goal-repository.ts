/**
 * Meta diária (`DailyGoal`, `prisma/schema.prisma`, docs/DATA-MODEL.md) — Fase 12 (agente
 * `study-tracking`). Única por `(userId, date)` — no máximo UMA linha por usuário/dia.
 *
 * Espelha o schema Prisma EXATAMENTE (sem colunas de "progresso"): esta entidade guarda só o
 * ALVO (`targetMinutes`/`targetPoints`, ambos opcionais — uma meta pode ser por tempo, por
 * pontos, ou pelos dois) e o RESULTADO (`achieved`/`achievedAt`, que nunca regride depois de
 * `true` — mesma garantia de "nunca desconclui" de `LessonProgress`). O PROGRESSO atual
 * (pontos/minutos já obtidos no dia) é sempre recomputado ao vivo a partir do ledger real
 * (`PointTransactionRepository`/`StudySessionRepository`) — nunca persistido aqui, para não
 * duplicar a fonte de verdade (mesmo princípio de `computeUserGamificationStats`,
 * `@/server/services/gamification/read.ts`, que também nunca cacheia saldo).
 */
export interface DailyGoalEntity {
  id: string;
  userId: string;
  /** Data-calendário (ISO 8601 meia-noite UTC — convenção de `@/server/services/study-plan/date-utils`). */
  date: string;
  targetMinutes: number | null;
  targetPoints: number | null;
  achieved: boolean;
  /** ISO 8601, ou `null` enquanto não atingida. */
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyGoalUpsertInput {
  userId: string;
  date: string;
  targetMinutes: number | null;
  targetPoints: number | null;
  achieved: boolean;
  achievedAt: string | null;
  /** Relógio injetado pelo chamador — nunca `Date.now()` direto em código puro. */
  now: Date;
}

/** Abstração de persistência da meta diária (ADR-0002). */
export interface DailyGoalRepository {
  findByUserIdAndDate(userId: string, date: string): Promise<DailyGoalEntity | null>;
  /** Histórico do usuário (qualquer data) — usado para consistência/relatórios (Fase 12). */
  listByUserId(userId: string): Promise<DailyGoalEntity[]>;
  /** Cria ou atualiza a linha de `(userId, date)` — idempotente (nunca duplica). */
  upsert(input: DailyGoalUpsertInput): Promise<DailyGoalEntity>;
}
