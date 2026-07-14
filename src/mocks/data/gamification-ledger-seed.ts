import { GAMIFICATION_REWARDS, GAMIFICATION_RULE_VERSION } from "@/config/business";
import { mockGamificationStates } from "./dashboard-gamification";
import { mockMockExamAttempts } from "./mock-exam-attempts";
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

const adjustmentEventSeed: GamificationEventEntity[] = Object.entries(mockGamificationStates).map(
  ([userId, state]) => ({
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
  }),
);

const adjustmentPointTransactionSeed: PointTransactionEntity[] = Object.entries(mockGamificationStates).map(
  ([userId, state]) => ({
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
  }),
);

/**
 * Eventos/transações `MOCK_EXAM_COMPLETED` DERIVADOS das tentativas FINALIZADAS já semeadas em
 * `mock-exam-attempts.ts` — nunca literais soltos. Sem isso, `computeUserGamificationStats`
 * (`./read.ts`) contava `mockExamsCompleted` a partir de um ledger que nunca recebeu o evento
 * correspondente, enquanto `averageMockExamScorePercent` (`@/server/services/profile/shared`)
 * já lia a MESMA tentativa direto do `MockExamAttemptRepository` — resultado incoerente na UI
 * ("Meu perfil"): "0 simulados realizados" ao lado de "75% de média" para `user-1` (Ana
 * Recruta). Derivar daqui garante as duas métricas na mesma fonte de verdade (a tentativa
 * finalizada) mesmo a leitura passando por caminhos de agregação diferentes.
 */
const finishedMockExamAttempts = mockMockExamAttempts.filter((attempt) => attempt.status === "FINISHED");

const mockExamEventSeed: GamificationEventEntity[] = finishedMockExamAttempts.map((attempt) => ({
  id: `gam-evt-seed-mock-exam-${attempt.id}`,
  userId: attempt.userId,
  type: "MOCK_EXAM_COMPLETED",
  idempotencyKey: `mock-exam-completed:${attempt.userId}:${attempt.id}`,
  sourceType: "MOCK_EXAM_ATTEMPT",
  sourceId: attempt.id,
  points: GAMIFICATION_REWARDS.MOCK_EXAM_COMPLETED.points,
  xp: GAMIFICATION_REWARDS.MOCK_EXAM_COMPLETED.xp,
  ruleVersion: GAMIFICATION_RULE_VERSION,
  context: { accuracyPercent: attempt.scorePercent ?? 0 },
  status: "PROCESSED",
  createdAt: attempt.finishedAt ?? SEED_CREATED_AT,
}));

const mockExamPointTransactionSeed: PointTransactionEntity[] = finishedMockExamAttempts.map((attempt) => ({
  id: `pt-seed-mock-exam-${attempt.id}`,
  userId: attempt.userId,
  gamificationEventId: `gam-evt-seed-mock-exam-${attempt.id}`,
  idempotencyKey: `mock-exam-completed:${attempt.userId}:${attempt.id}`,
  type: "EARN",
  points: GAMIFICATION_REWARDS.MOCK_EXAM_COMPLETED.points,
  xp: GAMIFICATION_REWARDS.MOCK_EXAM_COMPLETED.xp,
  reason: `Simulado concluído: ${attempt.mockExamId}`,
  reversedTransactionId: null,
  createdAt: attempt.finishedAt ?? SEED_CREATED_AT,
}));

export const mockGamificationEventSeed: GamificationEventEntity[] = [...adjustmentEventSeed, ...mockExamEventSeed];

export const mockPointTransactionSeed: PointTransactionEntity[] = [
  ...adjustmentPointTransactionSeed,
  ...mockExamPointTransactionSeed,
];

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
