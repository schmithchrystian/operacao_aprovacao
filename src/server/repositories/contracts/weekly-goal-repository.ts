/**
 * Meta semanal (`WeeklyGoal`, `prisma/schema.prisma`, docs/DATA-MODEL.md) — Fase 12 (agente
 * `study-tracking`). Única por `(userId, weekStart)` — mesma forma/racional de `./daily-goal-repository.ts`
 * (ver esse arquivo para a nota completa sobre "alvo persistido, progresso sempre ao vivo").
 */
export interface WeeklyGoalEntity {
  id: string;
  userId: string;
  /** Segunda-feira (ISO 8601 meia-noite UTC) da semana — mesma convenção de `weekStartIso`
   *  (`@/server/services/study-plan/date-utils`), para reaproveitar o mesmo agrupamento semanal
   *  já usado pelo calendário do plano de estudos. */
  weekStart: string;
  targetMinutes: number | null;
  targetPoints: number | null;
  achieved: boolean;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyGoalUpsertInput {
  userId: string;
  weekStart: string;
  targetMinutes: number | null;
  targetPoints: number | null;
  achieved: boolean;
  achievedAt: string | null;
  /** Relógio injetado pelo chamador — nunca `Date.now()` direto em código puro. */
  now: Date;
}

/** Abstração de persistência da meta semanal (ADR-0002). */
export interface WeeklyGoalRepository {
  findByUserIdAndWeekStart(userId: string, weekStart: string): Promise<WeeklyGoalEntity | null>;
  /** Histórico do usuário (qualquer semana) — usado para consistência/relatórios (Fase 12). */
  listByUserId(userId: string): Promise<WeeklyGoalEntity[]>;
  /** Cria ou atualiza a linha de `(userId, weekStart)` — idempotente (nunca duplica). */
  upsert(input: WeeklyGoalUpsertInput): Promise<WeeklyGoalEntity>;
}
