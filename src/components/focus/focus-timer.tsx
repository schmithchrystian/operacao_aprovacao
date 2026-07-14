"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Maximize2, Minimize2, Music, Pause, Play, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/shared/progress-bar";
import { cn } from "@/lib/utils";
import { parseActionResultResponse } from "@/lib/fetch-action-result";
import { formatSecondsAsClock } from "@/components/simulations/labels";
import {
  focusHeartbeatResultDTOSchema,
  type FinishFocusResultDTO,
  type FocusHeartbeatInput,
  type FocusSessionDTO,
} from "@/contracts/focus";
import { FOCUS } from "@/config/business";
import { FOCUS_MODE_ICON, FOCUS_MODE_LABEL, shouldAnnounceFocusMark } from "./labels";
import { FocusFinishDialog } from "./focus-finish-dialog";

/** Cadência de referência do backend para o heartbeat de foco (`FOCUS.heartbeatIntervalSeconds`,
 *  `@/config/business`) — mesmo espírito de `HEARTBEAT_INTERVAL_MS` em
 *  `@/components/lessons/lesson-player.tsx`, adaptado à cadência própria deste domínio (15s, mais
 *  espaçada que o player de vídeo). */
const HEARTBEAT_INTERVAL_MS = FOCUS.heartbeatIntervalSeconds * 1000;

/**
 * Janela de "interação recente" usada para montar o sinal bruto `interacting` (mouse/teclado/
 * toque/scroll). Deliberadamente generosa (90s, bem acima da cadência do heartbeat): um aluno
 * genuinamente estudando/lendo passa longos períodos sem tocar mouse ou teclado — o que este
 * sinal precisa capturar é AUSÊNCIA PROLONGADA (aba esquecida, aluno realmente ausente), não
 * micro-pausas de leitura. Ainda é um sinal honesto: sem NENHUMA interação por mais de 90s, o
 * próximo heartbeat reporta `interacting:false` normalmente.
 */
const INTERACTION_RECENCY_MS = 90_000;
const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll", "wheel"] as const;

/** Códigos de erro TRANSITÓRIOS do heartbeat que não devem alarmar o usuário — mesmo tratamento
 *  de `TRANSIENT_ERROR_CODES` em `@/components/lessons/lesson-player.tsx`. */
const TRANSIENT_ERROR_CODES = new Set(["RATE_LIMITED"]);

interface FocusTimerProps {
  session: FocusSessionDTO;
  subjectName: string | null;
  topicName: string | null;
  onFinished: (result: FinishFocusResultDTO) => void;
  /** A sessão não está mais utilizável por este caminho (descartada por um novo início em outra
   *  aba/dispositivo, ou já finalizada em outro lugar) — volta para a tela de configuração. */
  onDiscarded: (message: string) => void;
}

/**
 * Timer do Modo Foco/Pomodoro (Fase 15 — UI, item 3 da tarefa). ÚNICO Client Component com
 * interatividade real desta fase do fluxo — `FocusWorkspace` monta este componente com
 * `key={session.id}` (uma instância nova por sessão, sem estado vazando entre sessões).
 *
 * REGRA CRÍTICA (nunca violar): o cronômetro aqui é só DISPLAY. `elapsedSeconds`/
 * `cyclesCompleted` exibidos são sempre o último valor devolvido pelo SERVIDOR (heartbeat), com
 * um tique local de 1s só para suavizar a exibição entre heartbeats (mesmo padrão do cronômetro
 * de `@/components/simulations/attempt-runner.tsx`) — o servidor corrige o valor a cada resposta
 * de heartbeat, então qualquer deriva local é sempre pequena e autocorrigida. O heartbeat enviado
 * carrega só sinais BRUTOS (`FocusHeartbeatInput`) — nunca "concluído"/pontos/tempo calculado.
 *
 * PAUSAR/RETOMAR tem efeito real (não é só cosmético): pausar/retomar controla o sinal
 * `interacting` enviado nos heartbeats seguintes, não só o tique visual local — ver comentário de
 * `buildHeartbeatPayload` e a ordem de chamadas em `handlePause`/`handleResume` abaixo.
 */
export function FocusTimer({ session: initialSession, subjectName, topicName, onFinished, onDiscarded }: FocusTimerProps) {
  const [session, setSession] = useState(initialSession);
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSession.elapsedSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [lastAnnouncedSeconds, setLastAnnouncedSeconds] = useState<number | null>(null);

  // Inicializado com `0` (não `Date.now()`, que é impuro e não pode ser chamado durante o
  // render — React Compiler `react-hooks/purity`) — o valor real é atribuído no efeito de
  // montagem logo abaixo, antes de qualquer heartbeat ser enviado.
  const lastInteractionAtRef = useRef(0);
  const isPausedRef = useRef(false);
  const hadErrorRef = useRef(false);
  const stoppedRef = useRef(false);
  const autoFinishTriggeredRef = useRef(false);
  const sendHeartbeatRef = useRef<() => void>(() => {});
  const flushHeartbeatRef = useRef<() => void>(() => {});

  const targetSeconds = session.targetSeconds;
  const hasTarget = targetSeconds > 0;
  const remainingSeconds = hasTarget ? Math.max(0, targetSeconds - elapsedSeconds) : null;
  const progressPercent = hasTarget ? Math.min(100, (elapsedSeconds / targetSeconds) * 100) : 0;
  const timeIsUp = hasTarget && remainingSeconds === 0;

  // Monta os SINAIS BRUTOS a partir do estado atual — nunca calcula "tempo válido"/conclusão.
  // `interacting` é `false` sempre que pausado (por construção, via `isPausedRef`) OU quando não
  // há interação real recente — o servidor decide o resto a partir do próprio relógio
  // (`evaluateFocusHeartbeat`, `@/server/services/focus/focus-heartbeat-evaluator.ts`).
  const buildHeartbeatPayload = useCallback((): FocusHeartbeatInput => {
    const recentlyInteracted = Date.now() - lastInteractionAtRef.current <= INTERACTION_RECENCY_MS;
    return {
      sessionId: session.id,
      tabVisible: document.visibilityState === "visible",
      interacting: !isPausedRef.current && recentlyInteracted,
      clientTimestamp: Date.now(),
    };
  }, [session.id]);

  const sendHeartbeat = useCallback(async () => {
    if (stoppedRef.current) return;
    const payload = buildHeartbeatPayload();

    try {
      const response = await fetch("/api/focus/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await parseActionResultResponse(response, focusHeartbeatResultDTOSchema);

      if (!result.ok) {
        if (response.status === 429 || TRANSIENT_ERROR_CODES.has(result.error.code)) {
          return;
        }
        if (result.error.code === "CONFLICT") {
          stoppedRef.current = true;
          onDiscarded(
            "Esta sessão de foco não está mais ativa — ela pode ter sido encerrada em outra aba ou dispositivo.",
          );
          return;
        }
        if (!hadErrorRef.current) {
          hadErrorRef.current = true;
          toast.error("Não foi possível registrar seu progresso de foco agora. Vamos tentar de novo em instantes.");
        }
        return;
      }

      hadErrorRef.current = false;
      // Fonte única do tempo/ciclos exibidos: o valor recomputado pelo servidor.
      setSession(result.data.session);
      setElapsedSeconds(result.data.session.elapsedSeconds);
    } catch {
      if (!hadErrorRef.current) {
        hadErrorRef.current = true;
        toast.error("Falha de conexão ao registrar seu progresso de foco.");
      }
    }
  }, [buildHeartbeatPayload, onDiscarded]);

  // Flush "best-effort" ao esconder a aba / desmontar — mesmo padrão de `lesson-player.tsx`
  // (sendBeacon com fallback para fetch keepalive; resposta ignorada de propósito).
  const flushHeartbeat = useCallback(() => {
    if (stoppedRef.current) return;
    const payload = buildHeartbeatPayload();
    const body = JSON.stringify(payload);

    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/focus/heartbeat", blob)) return;
    }

    void fetch("/api/focus/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Best-effort no unload — falha aqui não é acionável nem observável pelo usuário.
    });
  }, [buildHeartbeatPayload]);

  useEffect(() => {
    sendHeartbeatRef.current = sendHeartbeat;
  }, [sendHeartbeat]);

  useEffect(() => {
    flushHeartbeatRef.current = flushHeartbeat;
  }, [flushHeartbeat]);

  // Rastreia interação REAL (não fabricada) — atualiza só um timestamp; o cálculo de "recente"
  // acontece em `buildHeartbeatPayload` no momento do envio. Também estabelece a base inicial
  // (montagem = interação recente por definição, o aluno acabou de iniciar a sessão).
  useEffect(() => {
    lastInteractionAtRef.current = Date.now();
    function markInteraction() {
      lastInteractionAtRef.current = Date.now();
    }
    for (const eventName of INTERACTION_EVENTS) {
      window.addEventListener(eventName, markInteraction, { passive: true });
    }
    return () => {
      for (const eventName of INTERACTION_EVENTS) {
        window.removeEventListener(eventName, markInteraction);
      }
    };
  }, []);

  // Ciclo de vida do heartbeat: heartbeat imediato ao montar + intervalo fixo pela duração da
  // sessão (mesmo padrão de `handlePlay`/cleanup de `lesson-player.tsx`). As chamadas passam
  // sempre pelas refs (`sendHeartbeatRef`/`flushHeartbeatRef`) para que o intervalo não precise
  // ser recriado a cada mudança de estado (pausa, sessão sincronizada etc.) — por isso o array de
  // dependências fica vazio de propósito (setup único por montagem; `FocusWorkspace` já força uma
  // montagem nova por sessão via `key={session.id}`).
  useEffect(() => {
    void sendHeartbeatRef.current();
    const intervalId = setInterval(() => void sendHeartbeatRef.current(), HEARTBEAT_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushHeartbeatRef.current();
      } else {
        void sendHeartbeatRef.current();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
      flushHeartbeatRef.current();
    };
  }, []);

  // Tique visual local (1s) — só suaviza a exibição entre heartbeats; nunca é a fonte usada para
  // validar tempo (mesmo padrão do cronômetro de `AttemptRunner`). Para no alvo (modo com alvo
  // fixo) ou quando pausado.
  useEffect(() => {
    if (isPaused) return;
    if (hasTarget && elapsedSeconds >= targetSeconds) return;
    const timeoutId = setTimeout(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => clearTimeout(timeoutId);
  }, [elapsedSeconds, isPaused, hasTarget, targetSeconds]);

  // Tempo esgotado (só modos com alvo fixo): pausa e abre o formulário de encerramento
  // automaticamente, uma única vez (guard via ref — `remainingSeconds` permanece 0 em renders
  // seguintes). O cronômetro livre nunca cai aqui (`hasTarget` é sempre falso nesse modo).
  useEffect(() => {
    if (!hasTarget || remainingSeconds !== 0 || autoFinishTriggeredRef.current) return;
    autoFinishTriggeredRef.current = true;
    isPausedRef.current = true;
    setIsPaused(true);
    setShowFinishDialog(true);
    toast.message("Tempo esgotado! Registre como foi essa sessão para concluir.");
  }, [hasTarget, remainingSeconds]);

  // Anuncia (aria-live) só em marcos — nunca a cada segundo. Calculado DURANTE o render (sem
  // efeito) — mesmo padrão de `@/components/simulations/attempt-timer.tsx`: evita o render extra
  // em cascata que um `useEffect` + `setState` causaria.
  const displaySeconds = hasTarget ? (remainingSeconds ?? 0) : elapsedSeconds;
  if (displaySeconds !== lastAnnouncedSeconds && shouldAnnounceFocusMark(displaySeconds, hasTarget)) {
    setLastAnnouncedSeconds(displaySeconds);
    setAnnouncement(
      hasTarget
        ? displaySeconds <= 0
          ? "Tempo esgotado."
          : `Tempo restante: ${formatSecondsAsClock(displaySeconds)}.`
        : `Tempo decorrido: ${formatSecondsAsClock(displaySeconds)}.`,
    );
  }

  function handlePause() {
    if (isPausedRef.current) return;
    // Fecha o intervalo ativo até AGORA com sinceridade (isPausedRef ainda é `false` neste
    // instante) — só DEPOIS disso a pausa passa a valer para os próximos heartbeats.
    void sendHeartbeatRef.current();
    isPausedRef.current = true;
    setIsPaused(true);
  }

  function handleResume() {
    if (timeIsUp || !isPausedRef.current) return;
    // Fecha o hiato pausado como IDLE (isPausedRef ainda `true` aqui, então `interacting:false`)
    // ANTES de voltar a contar — evita que este heartbeat credite o tempo em que a sessão esteve
    // pausada. Só depois disso a contagem volta a valer para os próximos heartbeats/tiques.
    void sendHeartbeatRef.current();
    isPausedRef.current = false;
    setIsPaused(false);
    lastInteractionAtRef.current = Date.now();
  }

  function handleRequestFinish() {
    handlePause();
    setShowFinishDialog(true);
  }

  function handleFinishDialogFinished(result: FinishFocusResultDTO) {
    stoppedRef.current = true;
    setShowFinishDialog(false);
    onFinished(result);
  }

  function handleFinishDialogConflict(message: string) {
    stoppedRef.current = true;
    setShowFinishDialog(false);
    onDiscarded(message);
  }

  function handleAmbientSoundClick() {
    // Toggle HONESTO (documentado na tarefa): nenhum áudio é realmente tocado nesta fase — só
    // avisa que o recurso ainda não existe, em vez de fingir um player funcional.
    toast.info("Som ambiente chega em uma próxima atualização. Por enquanto, use seu player de música preferido.");
  }

  const ModeIcon = FOCUS_MODE_ICON[session.mode];

  const timerContent = (
    <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Badge variant="outline" className="gap-1">
          <ModeIcon className="h-3 w-3" aria-hidden="true" />
          {FOCUS_MODE_LABEL[session.mode]}
        </Badge>
        {subjectName ? (
          <Badge variant="outline">
            {subjectName}
            {topicName ? ` · ${topicName}` : ""}
          </Badge>
        ) : null}
      </div>

      {session.objective ? (
        <p className="text-muted-foreground text-sm">
          Objetivo: <span className="text-foreground font-medium">{session.objective}</span>
        </p>
      ) : null}

      <div role="timer" aria-label={hasTarget ? "Tempo restante" : "Tempo decorrido"} className="space-y-1">
        <p
          aria-hidden="true"
          className={cn(
            "font-heading tabular-nums font-semibold tracking-tight",
            isDistractionFree ? "text-7xl" : "text-5xl",
            timeIsUp && "text-success",
          )}
        >
          {formatSecondsAsClock(displaySeconds)}
        </p>
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {hasTarget ? "Tempo restante" : "Cronômetro livre — sem alvo definido"}
        </p>
      </div>

      {hasTarget ? (
        <div className="w-full">
          <ProgressBar value={progressPercent} label="Progresso desta sessão" variant={timeIsUp ? "success" : "default"} />
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs">
        Ciclo {session.cyclesCompleted} de {session.cyclesPlanned}
      </p>

      {isPaused && !timeIsUp ? (
        <p role="status" className="text-muted-foreground text-xs">
          Sessão pausada — o tempo não está sendo contabilizado. Clique em Retomar para continuar.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {!timeIsUp ? (
          isPaused ? (
            <Button type="button" onClick={handleResume}>
              <Play aria-hidden="true" />
              Retomar
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={handlePause}>
              <Pause aria-hidden="true" />
              Pausar
            </Button>
          )
        ) : null}
        <Button type="button" variant={timeIsUp ? "default" : "outline"} onClick={handleRequestFinish}>
          <Square aria-hidden="true" />
          Encerrar sessão
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={isDistractionFree}
          onClick={() => setIsDistractionFree((current) => !current)}
        >
          {isDistractionFree ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          {isDistractionFree ? "Sair do modo sem distrações" : "Modo sem distrações"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleAmbientSoundClick}>
          <Music aria-hidden="true" />
          Som ambiente
          <Badge variant="secondary">Em breve</Badge>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {isDistractionFree ? (
        <div
          className="animate-in fade-in-0 motion-reduce:animate-none fixed inset-0 z-40 flex items-center justify-center bg-background p-6 duration-200"
          data-testid="focus-distraction-free-overlay"
        >
          {timerContent}
        </div>
      ) : (
        <Card>
          <CardContent className="flex justify-center py-10">{timerContent}</CardContent>
        </Card>
      )}

      <FocusFinishDialog
        open={showFinishDialog}
        onOpenChange={setShowFinishDialog}
        sessionId={session.id}
        objective={session.objective}
        onFinished={handleFinishDialogFinished}
        onConflict={handleFinishDialogConflict}
      />
    </>
  );
}
