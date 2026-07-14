"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { FinishFocusResultDTO, FocusSessionDTO } from "@/contracts/focus";
import type { SubjectOptionDTO } from "@/contracts/simulations";
import { FocusModeForm } from "./focus-mode-form";
import { FocusSessionResult } from "./focus-session-result";
import { FocusTimer } from "./focus-timer";

interface FocusWorkspaceProps {
  subjects: SubjectOptionDTO[];
}

interface ActiveSessionMeta {
  session: FocusSessionDTO;
  subjectName: string | null;
  topicName: string | null;
}

type Phase = "setup" | "active" | "result";

/**
 * Orquestrador único da tela `/modo-foco` (Fase 15 — UI). Máquina de estados simples de 3 fases
 * — nenhuma regra de negócio aqui, só decide QUAL componente mostrar; toda decisão de pontuação/
 * tempo válido vem sempre do servidor (`startFocusSessionAction` / heartbeat /
 * `finishFocusSessionAction`, todos chamados pelos componentes filhos).
 *
 * `key={activeSession.session.id}` em `FocusTimer`: força uma montagem nova a cada sessão (mesmo
 * padrão de `key={sessionKey}` em `@/app/(student)/flashcards/revisar/page.tsx`) — nenhum estado
 * (intervalos, refs de heartbeat) de uma sessão anterior vaza para a próxima.
 */
export function FocusWorkspace({ subjects }: FocusWorkspaceProps) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [activeSession, setActiveSession] = useState<ActiveSessionMeta | null>(null);
  const [finishResult, setFinishResult] = useState<FinishFocusResultDTO | null>(null);

  function handleStarted(session: FocusSessionDTO, meta: { subjectName: string | null; topicName: string | null }) {
    setActiveSession({ session, ...meta });
    setFinishResult(null);
    setPhase("active");
  }

  function handleFinished(result: FinishFocusResultDTO) {
    setFinishResult(result);
    setPhase("result");
  }

  function handleDiscarded(message: string) {
    setActiveSession(null);
    setPhase("setup");
    toast.info(message);
  }

  function handleStartAnother() {
    setActiveSession(null);
    setFinishResult(null);
    setPhase("setup");
  }

  if (phase === "active" && activeSession) {
    return (
      <FocusTimer
        key={activeSession.session.id}
        session={activeSession.session}
        subjectName={activeSession.subjectName}
        topicName={activeSession.topicName}
        onFinished={handleFinished}
        onDiscarded={handleDiscarded}
      />
    );
  }

  if (phase === "result" && finishResult) {
    return (
      <FocusSessionResult
        result={finishResult}
        subjectName={activeSession?.subjectName ?? null}
        topicName={activeSession?.topicName ?? null}
        onStartAnother={handleStartAnother}
      />
    );
  }

  return <FocusModeForm subjects={subjects} onStarted={handleStarted} />;
}
