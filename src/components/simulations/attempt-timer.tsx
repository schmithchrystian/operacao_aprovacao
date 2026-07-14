"use client";

import { useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSecondsAsClock } from "@/components/simulations/labels";

interface AttemptTimerProps {
  /** `null` = sem limite de tempo. Decrementado pelo componente pai (`AttemptRunner`) —
   *  este componente só EXIBE o valor recebido, nunca calcula tempo. */
  remainingSeconds: number | null;
}

/** Só anuncia (leitor de tela) em marcos — a cada minuto, e a cada 10s no último minuto —
 *  em vez de todo segundo (aria-live "moderado", conforme especificado). */
function shouldAnnounce(seconds: number): boolean {
  if (seconds <= 0) return true;
  if (seconds <= 60) return seconds % 10 === 0;
  return seconds % 60 === 0;
}

/**
 * Cronômetro de exibição da tentativa. Puramente informativo (CLAUDE.md §14/§18): o valor
 * inicial vem de `AttemptDTO.remainingSeconds` (calculado no servidor no momento da resposta) e
 * a contagem regressiva daqui em diante é só local/visual — quem valida o tempo real e corrige
 * a tentativa é sempre o servidor, a partir do relógio dele (`submitAndFinalize`).
 */
export function AttemptTimer({ remainingSeconds }: AttemptTimerProps) {
  const [announcedText, setAnnouncedText] = useState("");
  // Deriva o texto anunciado a partir da prop DURANTE o render (sem `useEffect`) — mesmo padrão
  // de `@/components/ranking/ranking-filters.tsx` para "ajustar estado a partir de props":
  // evita o cascading render que `setState` dentro de um efeito causaria, e converge no mesmo
  // render (a condição abaixo passa a ser falsa assim que `lastAnnounced` é atualizado).
  const [lastAnnounced, setLastAnnounced] = useState<number | null>(null);
  if (remainingSeconds !== null && remainingSeconds !== lastAnnounced && shouldAnnounce(remainingSeconds)) {
    setLastAnnounced(remainingSeconds);
    setAnnouncedText(
      remainingSeconds <= 0
        ? "Tempo esgotado. Enviando suas respostas."
        : `Tempo restante: ${formatSecondsAsClock(remainingSeconds)}.`,
    );
  }

  if (remainingSeconds === null) {
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <Timer className="h-4 w-4" aria-hidden="true" />
        Sem limite de tempo
      </div>
    );
  }

  const isUrgent = remainingSeconds <= 60;

  return (
    <div
      role="timer"
      aria-label="Tempo restante"
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-semibold tabular-nums",
        isUrgent ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border text-foreground",
      )}
    >
      <Timer className="h-4 w-4" aria-hidden="true" />
      <span aria-hidden="true">{formatSecondsAsClock(remainingSeconds)}</span>
      <span className="sr-only" aria-live="polite">
        {announcedText}
      </span>
    </div>
  );
}
