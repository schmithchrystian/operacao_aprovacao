import { FOCUS } from "@/config/business";
import type { FocusHeartbeatFlag } from "@/contracts/focus";
import type { FocusSessionEntity } from "@/server/repositories/contracts/focus-session-repository";

/**
 * Núcleo PURO (sem I/O) da reconstrução de tempo válido do Modo Foco (Fase 15 — CLAUDE.md
 * §14/§15). Equivalente a `@/server/services/study-tracking/heartbeat-evaluator.ts`, mas mais
 * simples: um timer de foco não tem "posição de vídeo" a validar contra saltos — só existe UMA
 * métrica, o tempo ATIVO (segundos de relógio real em que a aba estava visível E havia
 * interação recente), sempre medido pelo relógio do SERVIDOR no recebimento, nunca pelo
 * `clientTimestamp` (que só serve para detectar duplicidade exata).
 *
 * Diferente do heartbeat de vídeo, aqui a sessão SEMPRE existe antes do primeiro heartbeat
 * (`startFocusSession` já cria a linha com `lastHeartbeatAt = startedAt`) — não há um caso
 * "primeiro heartbeat estabelece a base" separado; o primeiro heartbeat já mede o intervalo
 * real desde o início da sessão.
 */
export interface FocusHeartbeatSignal {
  tabVisible: boolean;
  /** Interação recente (mouse/teclado/toque) detectada pelo cliente — sinal bruto, não uma
   *  alegação de "tempo válido". */
  interacting: boolean;
  /** Epoch ms do CLIENTE — só para detectar duplicidade exata, nunca para medir tempo real. */
  clientTimestamp: number;
}

export interface EvaluateFocusHeartbeatInput {
  signal: FocusHeartbeatSignal;
  /** Epoch ms do SERVIDOR no momento do recebimento — fonte de verdade do tempo decorrido. */
  receivedAt: number;
  previousSession: FocusSessionEntity;
}

export interface FocusHeartbeatEvaluation {
  /** Segundos de tempo ATIVO a somar a `FocusSessionEntity.activeSeconds` nesta chamada. */
  addedActiveSeconds: number;
  /** `true` quando este heartbeat conta como "atividade real" (não descartado) — usado para
   *  incrementar `validHeartbeatCount`, o sinal de atividade independente da duração total. */
  countsAsValid: boolean;
  flags: FocusHeartbeatFlag[];
  updatedSession: FocusSessionEntity;
}

export function evaluateFocusHeartbeat(input: EvaluateFocusHeartbeatInput): FocusHeartbeatEvaluation {
  const { signal, receivedAt, previousSession } = input;
  const nowIso = new Date(receivedAt).toISOString();

  // Heartbeat duplicado (mesmo clientTimestamp da sessão): no-op completo — não soma tempo nem
  // reprocessa nada (CLAUDE.md §14/§25, mesmo tratamento do heartbeat de vídeo).
  if (signal.clientTimestamp === previousSession.lastClientTimestamp) {
    return {
      addedActiveSeconds: 0,
      countsAsValid: false,
      flags: ["duplicate"],
      updatedSession: {
        ...previousSession,
        heartbeatCount: previousSession.heartbeatCount + 1,
      },
    };
  }

  const flags: FocusHeartbeatFlag[] = [];

  // Intervalo real medido pelo RELÓGIO DO SERVIDOR — nunca pelo `clientTimestamp`.
  const realElapsedSeconds = Math.max(0, (receivedAt - Date.parse(previousSession.lastHeartbeatAt)) / 1000);

  let cappedElapsed = realElapsedSeconds;
  if (realElapsedSeconds > FOCUS.heartbeatMaxGapSeconds) {
    cappedElapsed = FOCUS.heartbeatMaxGapSeconds;
    flags.push("gap_clamped");
  }

  const tabHidden = !signal.tabVisible;
  // Aba visível mas sem interação recente = pausa (ex.: aluno se ausentou sem trocar de aba).
  const idle = signal.tabVisible && !signal.interacting;
  if (tabHidden) flags.push("tab_hidden");
  else if (idle) flags.push("idle");

  const isActive = !tabHidden && !idle;
  const addedActiveSeconds = isActive ? cappedElapsed : 0;

  return {
    addedActiveSeconds,
    countsAsValid: isActive,
    flags,
    updatedSession: {
      ...previousSession,
      lastHeartbeatAt: nowIso,
      lastClientTimestamp: signal.clientTimestamp,
      activeSeconds: previousSession.activeSeconds + addedActiveSeconds,
      heartbeatCount: previousSession.heartbeatCount + 1,
      validHeartbeatCount: previousSession.validHeartbeatCount + (isActive ? 1 : 0),
      updatedAt: nowIso,
    },
  };
}
