import { mockGamificationStates } from "./dashboard-gamification";
import type { GamificationEventEntity } from "../../server/repositories/contracts/gamification-event-repository";
import type { PointTransactionEntity } from "../../server/repositories/contracts/point-transaction-repository";
import type { UserAchievementEntity } from "../../server/repositories/contracts/user-achievement-repository";

/**
 * Seed do ledger de gamificação (Fase 8 — agente `gamification`, ADR-0011).
 *
 * Antes desta fase, o dashboard exibia pontos/XP/nível/conquistas como literais fixos em
 * `src/mocks/data/dashboard-gamification.ts`/`dashboard-achievements.ts`. Agora esses valores
 * são recalculados no backend a partir do ledger real (`PointTransactionRepository`/
 * `UserAchievementRepository`) — este arquivo apenas SEMEIA o mock em memória com uma
 * transação `ADJUSTMENT` de "saldo inicial" por aluno (mesmo total que já era exibido) e as
 * conquistas correspondentes já desbloqueadas, para não regredir a demo/dashboard existente
 * enquanto os eventos de origem (aula/módulo/curso/simulado/streak) ainda não têm histórico
 * real acumulado neste ambiente mock.
 *
 * Cada linha tem `idempotencyKey` própria (`seed-adjustment:<userId>`) — mesma garantia de
 * idempotência do restante do ledger.
 */

const SEED_CREATED_AT = "2026-01-01T00:00:00.000Z";

export const mockGamificationEventSeed: GamificationEventEntity[] = Object.entries(
  mockGamificationStates,
).map(([userId, state]) => ({
  id: `gam-evt-seed-${userId}`,
  userId,
  type: "MANUAL_ADJUSTMENT",
  idempotencyKey: `seed-adjustment:${userId}`,
  sourceType: "SEED",
  sourceId: null,
  points: state.points,
  xp: state.xp,
  ruleVersion: 1,
  context: { reason: "Saldo inicial de demonstração (seed mock)." },
  status: "PROCESSED",
  createdAt: SEED_CREATED_AT,
}));

export const mockPointTransactionSeed: PointTransactionEntity[] = Object.entries(
  mockGamificationStates,
).map(([userId, state]) => ({
  id: `pt-seed-${userId}`,
  userId,
  gamificationEventId: `gam-evt-seed-${userId}`,
  idempotencyKey: `seed-adjustment:${userId}`,
  type: "ADJUSTMENT",
  points: state.points,
  xp: state.xp,
  reason: "Saldo inicial (seed de demonstração)",
  reversedTransactionId: null,
  createdAt: SEED_CREATED_AT,
}));

/**
 * Conquistas já desbloqueadas por aluno no seed, mapeadas para as `key`s canônicas de
 * `src/server/services/gamification/achievements.ts`. Nem toda conquista do mock antigo
 * (`dashboard-achievements.ts`) tem correspondente direta na lista oficial de ~18 desta fase
 * (ex.: "módulo concluído"/"curso concluído" isolados, "1º lugar no ranking" — este último é
 * Fase 9) — essas ficam de fora do seed por ora.
 */
export const mockUserAchievementSeed: UserAchievementEntity[] = [
  { userId: "user-1", achievementKey: "first-victory", unlockedAt: "2026-06-20T12:00:00.000Z" },
  { userId: "user-1", achievementKey: "streak-7", unlockedAt: "2026-07-05T09:30:00.000Z" },
  { userId: "user-1", achievementKey: "first-mock-exam", unlockedAt: "2026-07-10T18:45:00.000Z" },
  { userId: "user-2", achievementKey: "streak-7", unlockedAt: "2026-06-15T09:00:00.000Z" },
  { userId: "user-2", achievementKey: "streak-30", unlockedAt: "2026-07-11T08:00:00.000Z" },
  { userId: "user-3", achievementKey: "first-victory", unlockedAt: "2026-07-01T10:00:00.000Z" },
  { userId: "user-4", achievementKey: "streak-30", unlockedAt: "2026-06-25T11:15:00.000Z" },
];
