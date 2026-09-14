"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Film } from "lucide-react";
import { ProgressBar } from "@/components/shared/progress-bar";
import { ModuleStatusBadge } from "@/components/courses/lesson-status";
import { VictoryDialog } from "@/components/lessons/victory-dialog";
import { parseActionResultResponse } from "@/lib/fetch-action-result";
import {
  heartbeatResultDTOSchema,
  type HeartbeatInput,
  type LessonCompletionDTO,
} from "@/contracts/progress";
import type { LessonStatus } from "@/contracts/courses";

/**
 * Cadência do heartbeat periódico enquanto o vídeo está tocando (enunciado da Fase 7:
 * "a cada ~10s"). Bem acima de `STUDY_TRACKING.heartbeatMinClientIntervalMs` (5s) —
 * não existe para "otimizar" nada, só reflete a frequência real de um player humano.
 * É esse tick de 10s (nunca rate-limitado) que credita o progresso; heartbeats extras
 * por evento (seeked/pause/play) são só telemetria oportunista e podem ser descartados
 * pelo rate-limit do servidor sem perda de crédito.
 */
const HEARTBEAT_INTERVAL_MS = 10_000;

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/**
 * Códigos de erro TRANSITÓRIOS do heartbeat que NÃO devem alarmar o usuário. O rate-limit
 * (`RATE_LIMIT`/HTTP 429) é acionado por interação normal — scrubbing gera vários `seeked`
 * em janelas < `heartbeatMinClientIntervalMs`, pause→play rápido idem. Como o crédito real
 * vem do tick periódico de 10s (não limitado), descartar essas respostas é um no-op seguro.
 */
const TRANSIENT_ERROR_CODES = new Set(["RATE_LIMIT", "RATE_LIMITED"]);

interface LessonPlayerProps {
  lessonId: string;
  videoUrl: string;
  resumePositionSeconds: number;
  initialWatchedPercent: number;
  initialStatus: LessonStatus;
  nextLessonHref: string | null;
  nextLessonTitle: string | null;
  courseTrackHref: string;
}

/**
 * Player de vídeo da aula (Client Component — único ponto de interatividade real desta
 * página). Envia só SINAIS BRUTOS no heartbeat (CLAUDE.md §13, `docs/ARCHITECTURE.md §5`):
 * nunca calcula/envia percentual assistido, tempo total ou "concluído". Quem decide
 * progresso/conclusão é sempre o servidor — a resposta do heartbeat (`HeartbeatResultDTO`)
 * é a única fonte usada para atualizar a barra de progresso e disparar a "Vitória".
 */
export function LessonPlayer({
  lessonId,
  videoUrl,
  resumePositionSeconds,
  initialWatchedPercent,
  initialStatus,
  nextLessonHref,
  nextLessonTitle,
  courseTrackHref,
}: LessonPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeAppliedRef = useRef(false);
  const hadErrorRef = useRef(false);

  // Um `sessionId` novo por montagem do player — agrupa os heartbeats desta reprodução
  // (docs/ARCHITECTURE.md §5). Gerado uma única vez, nunca recalculado durante a sessão.
  const [mediaError, setMediaError] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [watchedPercent, setWatchedPercent] = useState(initialWatchedPercent);
  const [status, setStatus] = useState<LessonStatus>(initialStatus);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [victoryData, setVictoryData] = useState<LessonCompletionDTO | null>(null);
  const [victoryOpen, setVictoryOpen] = useState(false);

  // Monta os SINAIS BRUTOS a partir do estado atual do player — nunca calcula percentual/
  // tempo/"concluído". Devolve `null` enquanto a duração ainda não está disponível.
  const buildHeartbeatPayload = useCallback((): HeartbeatInput | null => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return null;
    }
    return {
      lessonId,
      sessionId,
      positionSeconds: video.currentTime,
      durationSeconds: video.duration,
      playing: !video.paused && !video.ended,
      tabVisible: document.visibilityState === "visible",
      playbackRate: video.playbackRate,
      clientTimestamp: Date.now(),
    };
  }, [lessonId, sessionId]);

  const sendHeartbeat = useCallback(async () => {
    const payload = buildHeartbeatPayload();
    if (!payload) {
      return;
    }

    try {
      const response = await fetch("/api/progress/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await parseActionResultResponse(response, heartbeatResultDTOSchema);

      if (!result.ok) {
        // Rate-limit é esperado durante interação normal (scrubbing/pause-play rápido) e
        // não perde crédito — o tick de 10s não é limitado. Descarta silenciosamente,
        // sem marcar estado de erro nem alarmar. Só falhas genuínas alarmam.
        if (response.status === 429 || TRANSIENT_ERROR_CODES.has(result.error.code)) {
          return;
        }
        if (!hadErrorRef.current) {
          hadErrorRef.current = true;
          toast.error("Não foi possível registrar seu progresso agora. Vamos tentar de novo em instantes.");
        }
        return;
      }

      hadErrorRef.current = false;
      // Fonte única do progresso exibido: o valor recomputado pelo servidor, nunca um
      // cálculo local a partir de `video.currentTime`/`video.duration`.
      setWatchedPercent(result.data.watchedPercent);
      setStatus(result.data.status);

      if (result.data.justCompleted && result.data.completion) {
        setVictoryData(result.data.completion);
        setVictoryOpen(true);
        // Reidrata a árvore Server Component (sidebar de módulos, progresso agregado,
        // liberação da próxima aula) — nenhum desses valores é recalculado no cliente.
        router.refresh();
      }
    } catch {
      if (!hadErrorRef.current) {
        hadErrorRef.current = true;
        toast.error("Falha de conexão ao registrar seu progresso.");
      }
    }
  }, [buildHeartbeatPayload, router]);

  /**
   * Flush final "best-effort" ao sair da página / esconder a aba — captura os últimos ≤10s
   * que o tick periódico ainda não enviou. `navigator.sendBeacon` sobrevive ao unload melhor
   * que `fetch`; fallback para `fetch` com `keepalive`. A resposta é ignorada de propósito
   * (a página está indo embora) — nenhum toast/estado, e mesmos SINAIS BRUTOS de sempre.
   */
  const flushHeartbeat = useCallback(() => {
    const payload = buildHeartbeatPayload();
    if (!payload) {
      return;
    }
    const body = JSON.stringify(payload);

    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/progress/heartbeat", blob)) {
        return;
      }
    }

    void fetch("/api/progress/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Best-effort no unload — falha aqui não é acionável nem observável pelo usuário.
    });
  }, [buildHeartbeatPayload]);

  const clearHeartbeatInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startHeartbeatInterval = useCallback(() => {
    clearHeartbeatInterval();
    intervalRef.current = setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  }, [clearHeartbeatInterval, sendHeartbeat]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function handleLoadedMetadata() {
      if (resumeAppliedRef.current || !video) return;
      resumeAppliedRef.current = true;
      if (resumePositionSeconds > 0 && resumePositionSeconds < video.duration) {
        video.currentTime = resumePositionSeconds;
      }
    }

    function handlePlay() {
      startHeartbeatInterval();
      void sendHeartbeat();
    }

    function handlePauseOrEnded() {
      clearHeartbeatInterval();
      void sendHeartbeat();
    }

    function handleSeeked() {
      void sendHeartbeat();
    }

    function handleRateChange() {
      if (video) setPlaybackRate(video.playbackRate);
      void sendHeartbeat();
    }

    function handleVisibilityChange() {
      // Ao esconder a aba, faz um flush robusto (sobrevive a fechar/navegar); ao voltar a
      // ficar visível, um heartbeat normal basta.
      if (document.visibilityState === "hidden") {
        flushHeartbeat();
      } else {
        void sendHeartbeat();
      }
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePauseOrEnded);
    video.addEventListener("ended", handlePauseOrEnded);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("ratechange", handleRateChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePauseOrEnded);
      video.removeEventListener("ended", handlePauseOrEnded);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("ratechange", handleRateChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearHeartbeatInterval();
      // Flush final ao desmontar (navegação SPA/fechar) — captura os últimos ≤10s.
      flushHeartbeat();
    };
  }, [
    resumePositionSeconds,
    sendHeartbeat,
    startHeartbeatInterval,
    clearHeartbeatInterval,
    flushHeartbeat,
  ]);

  function handlePlaybackRateChange(event: ChangeEvent<HTMLSelectElement>) {
    const rate = Number(event.target.value);
    const video = videoRef.current;
    if (video) {
      video.playbackRate = rate;
    }
    setPlaybackRate(rate);
  }

  return (
    <div className="space-y-4">
      {mediaError ? <p role="alert" className="text-sm">Não foi possível carregar o vídeo ou o acesso expirou. <button className="underline" onClick={() => { window.location.reload(); }}>Recarregar aula</button></p> : null}
      <div className="border-border relative aspect-video w-full overflow-hidden rounded-lg border bg-black">
        {videoUrl ? (
          <video
            ref={videoRef}
            onError={() => setMediaError(true)}
            className="h-full w-full"
            controls
            preload="metadata"
            aria-label="Vídeo da aula"
          >
            <source src={videoUrl} />
            Seu navegador não suporta a reprodução de vídeo.
          </video>
        ) : (
          <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-2">
            <Film className="h-10 w-10" aria-hidden="true" />
            <p className="text-sm">Vídeo indisponível para esta aula.</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <ProgressBar
            value={watchedPercent}
            label="Progresso desta aula"
            variant={status === "completed" ? "success" : "default"}
          />
        </div>
        <div className="flex items-center gap-2">
          <ModuleStatusBadge status={status} />
          <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
            Velocidade
            <select
              value={playbackRate}
              onChange={handlePlaybackRateChange}
              aria-label="Velocidade de reprodução"
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-7 rounded-md border px-2 text-xs text-foreground focus-visible:ring-3 focus-visible:outline-none"
            >
              {PLAYBACK_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}x
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <VictoryDialog
        open={victoryOpen}
        onOpenChange={setVictoryOpen}
        completion={victoryData}
        nextLessonHref={nextLessonHref}
        nextLessonTitle={nextLessonTitle}
        courseTrackHref={courseTrackHref}
      />
    </div>
  );
}
