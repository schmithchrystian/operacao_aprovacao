import { STUDY_TRACKING } from "@/config/business";
import type { HeartbeatFlag } from "@/contracts/progress";
import type {
  CoveredInterval,
  StudySessionEntity,
} from "@/server/repositories/contracts/study-session-repository";

/**
 * Núcleo PURO (sem I/O) da reconstrução de progresso de vídeo / tempo válido
 * (CLAUDE.md §13/§14). Recebe o sinal bruto do heartbeat + o estado anterior da sessão +
 * o horário do SERVIDOR no recebimento, devolve o veredito — fácil de testar isoladamente
 * (`tests/unit/heartbeat-evaluator.test.ts`) sem depender de repositórios/sessão real.
 *
 * Duas métricas distintas, deliberadamente desacopladas:
 * - `newInterval` (cobertura da LINHA DO TEMPO do vídeo) → alimenta `watchedPercent`/conclusão
 *   da aula (CLAUDE.md §12/§13). Validado contra saltos artificiais de POSIÇÃO.
 * - `addedValidSeconds` (tempo de RELÓGIO válido) → alimenta `StudySession.validSeconds`
 *   (CLAUDE.md §14, "tempo válido de estudo"). Só conta quando `playing && tabVisible`, nunca
 *   duplicado, e o intervalo real (medido pelo servidor) é limitado a `heartbeatMaxGapSeconds`.
 */

export { type CoveredInterval };

export function mergeIntervals(intervals: readonly CoveredInterval[]): CoveredInterval[] {
  const sorted = [...intervals].sort((a, b) => a.startSeconds - b.startSeconds);
  const merged: CoveredInterval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.startSeconds <= last.endSeconds) {
      last.endSeconds = Math.max(last.endSeconds, interval.endSeconds);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

export function sumIntervalSeconds(intervals: readonly CoveredInterval[]): number {
  return intervals.reduce((total, interval) => total + Math.max(0, interval.endSeconds - interval.startSeconds), 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface HeartbeatSignal {
  positionSeconds: number;
  playing: boolean;
  tabVisible: boolean;
  playbackRate: number;
  /** Epoch ms do CLIENTE — só para detectar duplicidade exata, nunca para medir tempo real. */
  clientTimestamp: number;
}

export interface EvaluateHeartbeatInput {
  userId: string;
  lessonId: string;
  sessionId: string;
  signal: HeartbeatSignal;
  /** Epoch ms do SERVIDOR no momento do recebimento — fonte de verdade do tempo decorrido. */
  receivedAt: number;
  previousSession: StudySessionEntity | null;
  /** Duração canônica (segundos) — SEMPRE do catálogo (`Lesson.durationMinutes * 60`). */
  canonicalDurationSeconds: number;
}

export interface HeartbeatEvaluation {
  /** Segundos de tempo válido a somar a `StudySession.validSeconds` nesta chamada. */
  addedValidSeconds: number;
  /** Trecho novo de vídeo coberto por esta chamada, ou `null` quando nada deve ser contado. */
  newInterval: CoveredInterval | null;
  flags: HeartbeatFlag[];
  updatedSession: StudySessionEntity;
}

export function evaluateHeartbeat(input: EvaluateHeartbeatInput): HeartbeatEvaluation {
  const { userId, lessonId, sessionId, signal, receivedAt, previousSession, canonicalDurationSeconds } = input;
  const nowIso = new Date(receivedAt).toISOString();
  const clampedPosition = clamp(signal.positionSeconds, 0, canonicalDurationSeconds);

  // Primeiro heartbeat desta sessão: só estabelece a posição/horário base, nada é contado
  // como assistido/válido ainda (evita creditar tempo por um único heartbeat isolado).
  if (!previousSession) {
    const flags: HeartbeatFlag[] = [];
    if (!signal.tabVisible) flags.push("tab_hidden");
    else if (!signal.playing) flags.push("not_playing");

    return {
      addedValidSeconds: 0,
      newInterval: null,
      flags,
      updatedSession: {
        id: sessionId,
        userId,
        lessonId,
        source: "LESSON",
        status: "ACTIVE",
        startedAt: nowIso,
        lastHeartbeatAt: nowIso,
        lastPositionSeconds: clampedPosition,
        lastClientTimestamp: signal.clientTimestamp,
        coveredIntervals: [],
        validSeconds: 0,
        heartbeatCount: 1,
        updatedAt: nowIso,
      },
    };
  }

  // Heartbeat duplicado (mesmo timestamp do cliente/sessão): no-op completo — não soma tempo
  // nem reprocessa posição (CLAUDE.md §13/§14/§25).
  if (signal.clientTimestamp === previousSession.lastClientTimestamp) {
    return {
      addedValidSeconds: 0,
      newInterval: null,
      flags: ["duplicate"],
      updatedSession: {
        ...previousSession,
        heartbeatCount: previousSession.heartbeatCount + 1,
      },
    };
  }

  const flags: HeartbeatFlag[] = [];

  // Intervalo real medido pelo RELÓGIO DO SERVIDOR — nunca pelo `clientTimestamp`.
  const realElapsedSeconds = Math.max(0, (receivedAt - Date.parse(previousSession.lastHeartbeatAt)) / 1000);

  let cappedElapsed = realElapsedSeconds;
  if (realElapsedSeconds > STUDY_TRACKING.heartbeatMaxGapSeconds) {
    cappedElapsed = STUDY_TRACKING.heartbeatMaxGapSeconds;
    flags.push("gap_clamped");
  }

  const tabHidden = !signal.tabVisible;
  const notPlaying = signal.tabVisible && !signal.playing;
  if (tabHidden) flags.push("tab_hidden");
  else if (notPlaying) flags.push("not_playing");
  const idle = tabHidden || notPlaying;

  const rateOutOfRange =
    signal.playbackRate > STUDY_TRACKING.maxPlausiblePlaybackRate ||
    signal.playbackRate < STUDY_TRACKING.minPlausiblePlaybackRate;
  if (rateOutOfRange) flags.push("rate_clamped");
  const effectiveRate = clamp(
    signal.playbackRate,
    STUDY_TRACKING.minPlausiblePlaybackRate,
    STUDY_TRACKING.maxPlausiblePlaybackRate,
  );

  const claimedVideoDelta = clampedPosition - previousSession.lastPositionSeconds;
  // Cobertura de vídeo NUNCA pode crescer mais rápido do que o tempo de RELÓGIO real (medido
  // pelo servidor) permitiria — mesmo para deltas pequenos. É esta a barreira contra o
  // ataque "1 heartbeat/s avançando 5s" (concluir ~5x sem assistir, CLAUDE.md §13): o
  // `positionJumpMinSeconds` só decide se levanta a flag de salto, nunca libera crédito além
  // do tempo real.
  const maxPlausibleVideoDelta = cappedElapsed * effectiveRate * STUDY_TRACKING.positionJumpToleranceFactor;

  let newInterval: CoveredInterval | null = null;
  if (!idle && claimedVideoDelta > 0) {
    // Um salto grande (seek à frente) além do plausível: o aluno NÃO assistiu o trecho pulado
    // — sinaliza e não credita nada (comportamento conservador anti-fraude).
    const isArtificialJump =
      claimedVideoDelta > STUDY_TRACKING.positionJumpMinSeconds && claimedVideoDelta > maxPlausibleVideoDelta;
    if (isArtificialJump) {
      flags.push("position_jump_discarded");
    } else {
      // Limita o avanço creditado ao máximo plausível pelo tempo real — um delta pequeno mas
      // enviado rápido demais (ex.: 5s a cada 1s) cobre no máximo `maxPlausibleVideoDelta`.
      const creditedDelta = Math.min(claimedVideoDelta, maxPlausibleVideoDelta);
      if (creditedDelta > 0) {
        newInterval = {
          startSeconds: previousSession.lastPositionSeconds,
          endSeconds: previousSession.lastPositionSeconds + creditedDelta,
        };
      }
    }
  }

  // Tempo válido de reprodução só acumula quando houve AVANÇO REAL de posição creditado
  // (`newInterval != null`) — vídeo "tocando" parado no mesmo ponto (buffer/travado/loop de um
  // frame) não conta como estudo (CLAUDE.md §14, "sessão sem atividade / inatividade").
  const addedValidSeconds = !idle && newInterval !== null ? cappedElapsed : 0;

  const updatedSession: StudySessionEntity = {
    ...previousSession,
    lastHeartbeatAt: nowIso,
    lastPositionSeconds: clampedPosition,
    lastClientTimestamp: signal.clientTimestamp,
    coveredIntervals: newInterval
      ? mergeIntervals([...previousSession.coveredIntervals, newInterval])
      : previousSession.coveredIntervals,
    validSeconds: previousSession.validSeconds + addedValidSeconds,
    heartbeatCount: previousSession.heartbeatCount + 1,
    updatedAt: nowIso,
  };

  return { addedValidSeconds, newInterval, flags, updatedSession };
}
