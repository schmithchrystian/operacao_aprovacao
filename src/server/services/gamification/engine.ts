import { GAMIFICATION_REWARDS, GAMIFICATION_RULE_VERSION } from "@/config/business";
import { auditLog } from "@/server/audit";
import { getRepositories } from "@/server/repositories";
import type {
  GamificationEventType,
  GamificationEventEntity,
} from "@/server/repositories/contracts/gamification-event-repository";
import type { PointTransactionEntity } from "@/server/repositories/contracts/point-transaction-repository";
import { evaluateAchievements, type AchievementDefinition } from "./achievements";
import { computeUserGamificationStats } from "./read";

/**
 * Motor central de recompensa (Fase 8 — agente `gamification`, CLAUDE.md §15/§25, ADR-0008).
 *
 * TODA concessão de pontos/XP passa por aqui — nenhum handler grava `PointTransaction`
 * diretamente. Regra dura: nunca aceitar pontos/XP calculados fora do backend (o valor vem
 * SEMPRE de `GAMIFICATION_REWARDS`, nunca de um parâmetro livre do chamador).
 *
 * Idempotência em três camadas, da mais externa para a mais interna:
 * 1. `InMemoryEventBus` (`src/server/events`) não invoca handlers duas vezes para a mesma
 *    `idempotencyKey` de evento de DOMÍNIO (ex.: `LessonCompleted`);
 * 2. este motor verifica `PointTransactionRepository.findByIdempotencyKey` ANTES de criar
 *    (repovoa handlers chamados fora do bus, ex.: reprocessamento manual/teste);
 * 3. `PointTransactionRepository.create`/`GamificationEventRepository.create` são, eles
 *    próprios, idempotentes (constraint única real no Prisma; checagem equivalente no mock).
 *
 * TODO(MÉDIO — fase de banco): no Prisma, os passos 2 (leitura) e a criação subsequente devem
 * ocorrer em uma ÚNICA transação de banco (apoiada nas constraints `@unique`) para fechar a
 * janela de corrida entre duas chamadas concorrentes com a mesma `idempotencyKey` — o mock em
 * memória de processo não reproduz isso (single-threaded por natureza do Node).
 */
export interface AwardGamificationEventInput {
  userId: string;
  type: GamificationEventType;
  sourceType: string;
  sourceId: string | null;
  idempotencyKey: string;
  reason: string;
  context?: Record<string, unknown>;
  /** Relógio injetado pelo chamador — nunca `Date.now()`/`new Date()` direto aqui dentro. */
  now?: Date;
}

export interface AwardGamificationEventResult {
  transaction: PointTransactionEntity;
  event: GamificationEventEntity;
  /** `true` só quando esta chamada de fato criou a transação (primeira vez); `false` quando
   *  devolveu uma já existente pela mesma `idempotencyKey` (no-op idempotente). */
  awardedNow: boolean;
}

/** Consulta o valor vigente da regra para um tipo de evento (`config/business.ts`). */
export function computeReward(type: GamificationEventType): { points: number; xp: number } {
  return GAMIFICATION_REWARDS[type];
}

/**
 * Credita (ou devolve o registro já existente para) um evento de gamificação. Idempotente
 * por `idempotencyKey` — nunca credita duas vezes o mesmo fato de origem.
 */
export async function awardGamificationEvent(
  input: AwardGamificationEventInput,
): Promise<AwardGamificationEventResult> {
  const repos = getRepositories();
  const now = input.now ?? new Date();

  const existingTransaction = await repos.pointTransactions.findByIdempotencyKey(input.idempotencyKey);
  if (existingTransaction) {
    const existingEvent = await repos.gamificationEvents.findByIdempotencyKey(input.idempotencyKey);
    if (existingEvent) {
      return { transaction: existingTransaction, event: existingEvent, awardedNow: false };
    }
    // Estado inconsistente defensivo (não deveria ocorrer): transação existe sem evento —
    // ainda assim não recredita; apenas relata o evento ausente como `SKIPPED` para auditoria.
    auditLog({
      operation: "gamification.award-event.inconsistent-state",
      userId: input.userId,
      entity: "GamificationEvent",
      entityId: input.sourceId ?? undefined,
      result: "failure",
      correlationId: input.idempotencyKey,
    });
    throw new Error(
      `Estado inconsistente de gamificação: PointTransaction existe sem GamificationEvent (key=${input.idempotencyKey}).`,
    );
  }

  const { points, xp } = computeReward(input.type);

  const event = await repos.gamificationEvents.create({
    userId: input.userId,
    type: input.type,
    idempotencyKey: input.idempotencyKey,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    points,
    xp,
    ruleVersion: GAMIFICATION_RULE_VERSION,
    status: "PROCESSED",
    context: input.context,
    now,
  });

  const transaction = await repos.pointTransactions.create({
    userId: input.userId,
    gamificationEventId: event.id,
    idempotencyKey: input.idempotencyKey,
    type: "EARN",
    points,
    xp,
    reason: input.reason,
    now,
  });

  auditLog({
    operation: `gamification.award-event.${input.type.toLowerCase()}`,
    userId: input.userId,
    entity: "PointTransaction",
    entityId: input.sourceId ?? undefined,
    result: "success",
    correlationId: input.idempotencyKey,
    metadata: { points, xp, ruleVersion: GAMIFICATION_RULE_VERSION },
  });

  return { transaction, event, awardedNow: true };
}

/**
 * Reavalia as conquistas do usuário após uma mudança de estado (ex.: aula/módulo/curso
 * concluído) e desbloqueia (de forma idempotente) as que acabaram de ser atingidas.
 * Chamar de novo sem mudança de estado real devolve lista vazia (nada novo a desbloquear).
 */
export async function syncAchievementsForUser(userId: string, now?: Date): Promise<AchievementDefinition[]> {
  const repos = getRepositories();
  const stats = await computeUserGamificationStats(userId);
  const unlockedRecords = await repos.userAchievements.listByUserId(userId);
  const alreadyUnlockedKeys = unlockedRecords.map((record) => record.achievementKey);

  const newlyUnlocked = evaluateAchievements(stats, alreadyUnlockedKeys);

  const effectiveNow = now ?? new Date();
  for (const achievement of newlyUnlocked) {
    await repos.userAchievements.unlock(userId, achievement.key, effectiveNow);
    auditLog({
      operation: "gamification.achievement-unlocked",
      userId,
      entity: "UserAchievement",
      entityId: achievement.key,
      result: "success",
      correlationId: `achievement:${userId}:${achievement.key}`,
    });
  }

  return newlyUnlocked;
}
