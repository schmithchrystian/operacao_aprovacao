import { STUDY_TRACKING_OVERVIEW } from "@/config/business";
import { eventBus } from "@/server/events";
import { getRepositories } from "@/server/repositories";
import type { UserStreakEntity } from "@/server/repositories/contracts/user-streak-repository";
import {
  buildIdempotencyKey,
  registerGamificationEventHandlers,
  type StreakReachedPayload,
} from "@/server/services/gamification";
import {
  ALL_HISTORY_SINCE_ISO,
  computeStreak,
  DEFAULT_TIMEZONE,
  toActivityDates,
  toCalendarDateIso,
} from "./activity-days";

/**
 * Registra os consumidores de gamificação assim que este módulo é carregado — mesmo padrão de
 * `study-tracking/record-heartbeat.ts`/`simulations/submit-and-finalize.ts` (idempotente; seguro
 * com múltiplos imports/hot-reload).
 */
registerGamificationEventHandlers();

export interface UserStreakView {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  freezesAvailable: number;
  updatedAt: string;
}

function toView(entity: UserStreakEntity): UserStreakView {
  return {
    currentStreak: entity.currentStreak,
    longestStreak: entity.longestStreak,
    lastActiveDate: entity.lastActiveDate,
    freezesAvailable: entity.freezesAvailable,
    updatedAt: entity.updatedAt,
  };
}

async function emitStreakReached(userId: string, milestone: 7 | 30, now: Date): Promise<void> {
  const type = milestone === 30 ? "STREAK_30" : "STREAK_7";
  await eventBus.emit<StreakReachedPayload>({
    type: "StreakReached",
    payload: { userId, milestone },
    idempotencyKey: buildIdempotencyKey(type, userId, String(milestone)),
    occurredAt: now,
  });
}

/**
 * Recalcula a sequência de estudo do usuário a partir das `StudySession`s reais (Fase 7 —
 * heartbeat/tempo válido; a regra de "o que conta como tempo válido" NÃO é reimplementada
 * aqui — só agregada via `toActivityDates`, `./activity-days.ts`) e persiste o resultado em
 * `UserStreakRepository` (cache materializado, mesmo espírito de `RankingScore`).
 *
 * Ao CRUZAR (nesta chamada) um marco de sequência com recompensa própria
 * (`STUDY_TRACKING_OVERVIEW.streakMilestones` = 7/30, CLAUDE.md §15), emite `StreakReached` —
 * idempotente em 3 camadas (mesmas de `awardGamificationEvent`,
 * `@/server/services/gamification/engine.ts`): 1) o guard `previousCurrent < milestone` evita
 * até TENTAR reemitir depois que o marco já foi cruzado uma vez; 2) a `idempotencyKey`
 * (`streak-7:<userId>:7`, sem data) garante que o EventBus nunca reprocessa; 3) o motor de
 * gamificação também checa por `idempotencyKey` antes de creditar. Resultado: mesmo que o
 * aluno quebre e reconstrua a sequência várias vezes, o bônus de "atingir 7/30 dias" só é pago
 * uma vez na vida do usuário (mecânica de marco único, como uma conquista — não um bônus
 * recorrente a cada ciclo de 7 dias).
 *
 * Autorização: função de SERVIÇO interna (chamada por `tracking-overview`/`dashboard-service`,
 * que já fazem `requireUser`/`assertOwnership` na fronteira) — não reaplica aqui para evitar
 * exigir uma sessão HTTP real em recálculos administrativos futuros (ex.: um cron de
 * fechamento diário, ainda não implementado nesta fase — ver pendências do relatório).
 *
 * TODO(MÉDIO — fase de banco): dois pontos LATENTES hoje (inofensivos porque `freezesAvailable`
 * nasce 0 e freeze nunca é concedido — ver `UserStreakEntity.freezesAvailable` — e porque o
 * mock roda single-threaded), mas que precisam de uma transação real de banco ao migrar para
 * Prisma:
 *  1. CONSUMO DE FREEZE NÃO-IDEMPOTENTE NO RECOMPUTE-ON-READ: cada `recalculateStreak` que
 *     atravessa um gap consome freeze(s) e PERSISTE `remainingFreezesAvailable` reduzido. Como
 *     hoje o recálculo é disparado "on read" (ao abrir Acompanhamento/Dashboard), duas leituras
 *     no mesmo dia poderiam queimar o freeze na 1ª e quebrar a sequência na 2ª — o resultado do
 *     streak deixa de ser idempotente por leitura. A correção definitiva é só descontar freeze
 *     no FECHAMENTO diário (um cron idempotente por data), não a cada leitura.
 *  2. EMISSÃO DE `StreakReached` APÓS O UPSERT, FORA DE TRANSAÇÃO: o `upsert` do streak e o
 *     `emit` do marco não são atômicos. Um crash entre os dois deixaria o streak persistido
 *     (com `currentStreak >= milestone`) sem o award — e o guard `previousCurrent < milestone`
 *     nunca mais reemitiria, PERDENDO o bônus. Idêntico ao TODO de transação única em
 *     `@/server/services/gamification/engine.ts`; no Prisma, upsert + emissão devem partilhar a
 *     mesma transação (ou usar um outbox persistido). Não dobra pontos hoje — o risco é perder,
 *     não duplicar (a `idempotencyKey` já barra a duplicação).
 */
export async function recalculateStreak(
  userId: string,
  now: Date,
  timezone: string = DEFAULT_TIMEZONE,
): Promise<UserStreakView> {
  const repos = getRepositories();
  const existing = await repos.userStreaks.findByUserId(userId);

  const sessions = await repos.studySessions.listRecentSessionsByUserId(userId, ALL_HISTORY_SINCE_ISO);
  const activeDates = toActivityDates(sessions, timezone);
  const today = toCalendarDateIso(now.toISOString(), timezone);

  const computation = computeStreak(activeDates, today, existing?.freezesAvailable ?? 0);
  const longestStreak = Math.max(computation.longestStreak, existing?.longestStreak ?? 0);
  const previousCurrent = existing?.currentStreak ?? 0;

  const updated = await repos.userStreaks.upsert({
    userId,
    currentStreak: computation.currentStreak,
    longestStreak,
    lastActiveDate: computation.lastActiveDate,
    freezesAvailable: computation.remainingFreezesAvailable,
    now,
  });

  for (const milestone of STUDY_TRACKING_OVERVIEW.streakMilestones) {
    if (previousCurrent < milestone && computation.currentStreak >= milestone) {
      await emitStreakReached(userId, milestone, now);
    }
  }

  return toView(updated);
}

/**
 * Leitura do cache SEM recalcular (`null` quando a linha ainda não existe — usuário sem
 * nenhuma sessão avaliada ainda). Mais barata que `recalculateStreak` para leituras que não
 * precisam do valor mais recente ao segundo (ex.: `computeUserGamificationStats`,
 * `@/server/services/gamification/read.ts`, que já é recomputado a cada chamada a partir do
 * ledger — não vale a pena reprocessar `StudySession` a cada leitura de conquistas também).
 */
export async function getUserStreak(userId: string): Promise<UserStreakView | null> {
  const repos = getRepositories();
  const entity = await repos.userStreaks.findByUserId(userId);
  return entity ? toView(entity) : null;
}
