/**
 * Sequência (streak) de dias consecutivos com estudo válido (`UserStreak`,
 * `prisma/schema.prisma`, docs/DATA-MODEL.md) — Fase 12 (agente `study-tracking`).
 *
 * `UserStreak` é 1:1 com `User` (a própria `userId` é a chave primária) — no máximo UMA linha
 * por usuário, sempre sobrescrita pelo recálculo mais recente (mesmo espírito de "cache
 * materializado" de `RankingScore`, `./ranking-score-repository.ts`, mas aqui sem versionamento:
 * não há necessidade de manter sequências antigas para auditoria/rollback de fórmula).
 *
 * FRONTEIRA CRÍTICA: este repositório é uma abstração de PERSISTÊNCIA pura — não decide o que
 * conta como "dia ativo" nem aplica a heurística de tolerância (freeze). Isso é feito no
 * serviço (`src/server/services/study-tracking/activity-days.ts` + `./streak.ts`) a partir das
 * `StudySession` já gravadas pela Fase 7 (heartbeat/tempo válido — não reimplementado aqui).
 */
export interface UserStreakEntity {
  userId: string;
  /** Sequência atual (dias consecutivos até hoje/ontem — ver `computeStreak`). */
  currentStreak: number;
  /** Maior sequência já alcançada (nunca diminui, independente da sequência atual). */
  longestStreak: number;
  /** Data (calendário, ISO 8601 meia-noite UTC — mesma convenção de `@/server/services/study-plan`)
   *  do último dia com atividade válida contabilizada; `null` quando o usuário nunca estudou. */
  lastActiveDate: string | null;
  /**
   * Nº de "freezes" (tolerância) disponíveis para perdoar exatamente 1 dia sem quebrar a
   * sequência (schema `UserStreak.freezesAvailable`, default 0). Mecânica de CONCESSÃO de
   * freezes (quando/como o aluno ganha um) não é especificada em CLAUDE.md — fica como
   * pendência explícita (registrada no relatório da Fase 12); aqui só o CONSUMO ao detectar
   * exatamente 1 dia perdido é implementado (`computeStreak`, `./study-tracking/activity-days.ts`).
   */
  freezesAvailable: number;
  /** ISO 8601 — quando esta linha foi recalculada pela última vez. */
  updatedAt: string;
}

export interface UserStreakUpsertInput {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  freezesAvailable: number;
  /** Relógio injetado pelo chamador (recálculo) — nunca `Date.now()` direto em código puro. */
  now: Date;
}

/** Abstração de persistência da sequência de estudo (ADR-0002). */
export interface UserStreakRepository {
  findByUserId(userId: string): Promise<UserStreakEntity | null>;
  /** Cria ou sobrescreve a linha do usuário — recálculo idempotente (nunca duplica; a mesma
   *  chamada 2x com os mesmos dados produz o mesmo estado final). */
  upsert(input: UserStreakUpsertInput): Promise<UserStreakEntity>;
}
