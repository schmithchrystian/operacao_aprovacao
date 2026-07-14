import { STUDY_TRACKING_OVERVIEW } from "@/config/business";
import { addDaysIso, toIsoDateUTC } from "@/server/services/study-plan/date-utils";

/**
 * Núcleo PURO (sem I/O, sem `Date.now()`/`Math.random()`) do calendário de atividade e da
 * sequência (streak) de estudo — Fase 12 (agente `study-tracking`, CLAUDE.md §14/§31).
 *
 * DELIBERADAMENTE sem nenhum import de `@/server/services/gamification` nem de
 * `@/server/repositories` — este módulo é uma FOLHA pura, seguro de importar de qualquer
 * domínio (inclusive `@/server/services/gamification/read.ts`, que precisa do mesmo cálculo de
 * "dias ativos"/streak para `UserGamificationStats` sem criar um ciclo de import com
 * `@/server/services/study-tracking/streak.ts` — esse sim depende de gamification para emitir
 * `StreakReached`, ver o comentário completo em `./streak.ts`).
 *
 * Datas de calendário aqui são sempre strings ISO 8601 à MEIA-NOITE UTC
 * (`yyyy-mm-ddT00:00:00.000Z`) — mesma convenção de `@/server/services/study-plan/date-utils`,
 * reaproveitada diretamente (nunca `yyyy-mm-dd` puro nem um `Date` com hora/minuto).
 */

/** Timezone default (UTC) — ver `STUDY_TRACKING_OVERVIEW.defaultTimezone` para o TODO de fonte real. */
export const DEFAULT_TIMEZONE = STUDY_TRACKING_OVERVIEW.defaultTimezone;

/**
 * Adapter para "desde o início dos tempos" — `StudySessionRepository.listRecentSessionsByUserId`
 * (Fase 7) exige um corte `sinceIso`; usar a época Unix devolve o histórico completo sem exigir
 * um novo método no repositório. Reaproveitado por `./streak.ts`, `./goals.ts`,
 * `./tracking-overview.ts` e `@/server/services/gamification/read.ts` (evita redeclarar a
 * mesma constante em cada arquivo).
 */
export const ALL_HISTORY_SINCE_ISO = new Date(0).toISOString();

/**
 * Resolve o "dia civil" (calendário, na timezone informada) em que um INSTANTE (ISO 8601 com
 * hora, ex.: `StudySession.lastHeartbeatAt`/`PointTransaction.createdAt`) cai, devolvido como
 * data-calendário ISO (meia-noite UTC) — pronta para comparar/agrupar com `targetDate`/
 * `weekStart` de outros contratos (`@/contracts/study-plan`).
 *
 * `Intl.DateTimeFormat` com `timeZone` é determinístico para um `instantIso` fixo (não lê o
 * relógio do sistema) — seguro para uma função "pura" no sentido de CLAUDE.md (mesma entrada
 * sempre produz a mesma saída), mesmo dependendo de uma API global do runtime.
 */
export function toCalendarDateIso(instantIso: string, timezone: string = DEFAULT_TIMEZONE): string {
  const instant = new Date(instantIso);
  // Locale "en-CA" formata como YYYY-MM-DD — truque padrão para obter a data civil já no
  // formato desejado sem montar a string manualmente a partir das partes.
  const calendarDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
  return toIsoDateUTC(calendarDate);
}

/**
 * Deriva o conjunto de "dias com atividade real" (CLAUDE.md — streak) a partir de sessões de
 * estudo já avaliadas pela Fase 7: só conta um dia quando alguma sessão acumulou
 * `validSeconds > 0` (tempo válido de fato, nunca `fim - início` bruto — a reconstrução já
 * aconteceu em `heartbeat-evaluator.ts`; aqui só se AGREGA o resultado).
 *
 * LIMITAÇÃO CONHECIDA (documentada, não um bug): o dia atribuído a uma sessão é o de
 * `lastHeartbeatAt` (último heartbeat aceito) — uma sessão que atravessa a meia-noite tem TODO
 * o seu `validSeconds` contado no dia do ÚLTIMO heartbeat, não distribuído entre os dois dias.
 * Aceitável para o MVP (sessões de vídeo/Pomodoro são tipicamente curtas, minutos, não horas
 * atravessando a virada do dia) — pendência registrada no relatório da Fase 12.
 */
export function toActivityDates(
  sessions: readonly { validSeconds: number; lastHeartbeatAt: string }[],
  timezone: string = DEFAULT_TIMEZONE,
): string[] {
  const dates = new Set<string>();
  for (const session of sessions) {
    if (session.validSeconds <= 0) continue;
    dates.add(toCalendarDateIso(session.lastHeartbeatAt, timezone));
  }
  return [...dates];
}

/** Soma de `validSeconds`, agrupada por dia civil (mesma resolução de `toActivityDates`). */
export function sumValidSecondsByDate(
  sessions: readonly { validSeconds: number; lastHeartbeatAt: string }[],
  timezone: string = DEFAULT_TIMEZONE,
): Map<string, number> {
  const byDate = new Map<string, number>();
  for (const session of sessions) {
    if (session.validSeconds <= 0) continue;
    const date = toCalendarDateIso(session.lastHeartbeatAt, timezone);
    byDate.set(date, (byDate.get(date) ?? 0) + session.validSeconds);
  }
  return byDate;
}

export interface StreakComputation {
  /** Sequência atual (dias consecutivos terminando hoje OU ontem — hoje ainda "em aberto" não
   *  quebra a sequência de ontem só por ainda não ter atividade registrada). */
  currentStreak: number;
  /** Maior sequência histórica (ignora freezes deliberadamente — ver nota abaixo). */
  longestStreak: number;
  /** `true` quando havia atividade histórica mas a sequência atual é 0 (quebrada). */
  streakBroken: boolean;
  /** Nº de freezes efetivamente consumidos nesta caminhada (informativo/auditoria). */
  freezesConsumed: number;
  /** Freezes restantes após o consumo desta chamada. */
  remainingFreezesAvailable: number;
  /** Último dia com atividade registrada, ou `null` se nunca houve. */
  lastActiveDate: string | null;
}

/** Limite defensivo de dias a caminhar para trás — evita loop longo/infinito com entrada
 *  patológica (nunca deveria ocorrer com dados reais; ~10 anos é uma folga generosa). */
const MAX_WALK_BACK_DAYS = 3650;

/**
 * Calcula a sequência (streak) de estudo — PURA e DETERMINÍSTICA: a mesma
 * `(activeDates, today, freezesAvailable)` sempre devolve o mesmo resultado.
 *
 * Regras (CLAUDE.md — "sequência atual; maior sequência; quebra de sequência; recuperação ou
 * tolerância, se definida"):
 * - `longestStreak` é o maior nº de dias consecutivos na história, IGNORANDO freezes —
 *   decisão deliberada: a "maior sequência" é um fato histórico bruto (o que de fato aconteceu
 *   dia a dia), enquanto o freeze é uma tolerância aplicada só à sequência ATUAL (em
 *   andamento) para não penalizar o aluno por um dia perdido pontual. Documentado aqui porque
 *   CLAUDE.md não detalha a interação entre os dois.
 * - `currentStreak` caminha de `today` para trás: um dia sem atividade EXATAMENTE hoje não
 *   quebra a sequência de ontem (o dia ainda não terminou). Cada dia perdido (que não seja hoje)
 *   é perdoado CONSUMINDO 1 de `freezesAvailable`; a sequência só quebra ao encontrar um dia
 *   perdido sem freeze restante. Com N freezes é possível atravessar até N dias perdidos (não
 *   necessariamente contíguos) — não há um limite separado de "tamanho de gap".
 */
export function computeStreak(
  activeDates: readonly string[],
  today: string,
  freezesAvailable = 0,
): StreakComputation {
  const uniqueSorted = [...new Set(activeDates)].sort();

  if (uniqueSorted.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      streakBroken: false,
      freezesConsumed: 0,
      remainingFreezesAvailable: freezesAvailable,
      lastActiveDate: null,
    };
  }

  const activeSet = new Set(uniqueSorted);
  const lastActiveDate = uniqueSorted[uniqueSorted.length - 1]!;

  // Maior sequência histórica — varredura simples de runs consecutivos, sem freeze.
  let longestStreak = 1;
  let runLength = 1;
  for (let i = 1; i < uniqueSorted.length; i += 1) {
    const previousDay = addDaysIso(uniqueSorted[i]!, -1);
    if (previousDay === uniqueSorted[i - 1]) {
      runLength += 1;
    } else {
      runLength = 1;
    }
    longestStreak = Math.max(longestStreak, runLength);
  }

  // Sequência atual — caminha de `today` para trás.
  let currentStreak = 0;
  let freezesLeft = freezesAvailable;
  let freezesConsumed = 0;
  let cursor = today;

  for (let steps = 0; steps < MAX_WALK_BACK_DAYS; steps += 1) {
    if (activeSet.has(cursor)) {
      currentStreak += 1;
      cursor = addDaysIso(cursor, -1);
      continue;
    }

    if (cursor === today) {
      // Hoje ainda não tem atividade registrada — normal (o dia não acabou), não quebra a
      // sequência de ontem. Segue caminhando sem incrementar `currentStreak` por hoje.
      cursor = addDaysIso(cursor, -1);
      continue;
    }

    if (freezesLeft > 0) {
      // Perdoa exatamente este dia (consome 1 freeze) e continua a caminhada sem quebrar.
      freezesLeft -= 1;
      freezesConsumed += 1;
      cursor = addDaysIso(cursor, -1);
      continue;
    }

    break; // gap real sem freeze disponível — sequência termina aqui.
  }

  const streakBroken = currentStreak === 0 && uniqueSorted.length > 0;

  return {
    currentStreak,
    longestStreak,
    streakBroken,
    freezesConsumed,
    remainingFreezesAvailable: freezesLeft,
    lastActiveDate,
  };
}

/**
 * "Todos os 7 dias da primeira semana de estudo tiveram atividade válida" (critério da
 * conquista "Primeira semana completa", `@/server/services/gamification/achievements.ts`).
 * PURA — os 7 dias considerados são sempre os que começam no PRIMEIRO dia ativo já registrado
 * (não uma janela fixa de calendário), então não depende de `today`.
 */
export function isFirstWeekFullyActive(activeDates: readonly string[]): boolean {
  if (activeDates.length < 7) return false;

  const uniqueSorted = [...new Set(activeDates)].sort();
  const activeSet = new Set(uniqueSorted);
  const firstDay = uniqueSorted[0]!;

  for (let offset = 0; offset < 7; offset += 1) {
    if (!activeSet.has(addDaysIso(firstDay, offset))) {
      return false;
    }
  }
  return true;
}
