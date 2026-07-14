import { Clock, RotateCcw, Trophy, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatSecondsAsDuration } from "@/components/simulations/labels";
import type { FinishFocusResultDTO } from "@/contracts/focus";
import { FOCUS_MODE_LABEL } from "./labels";

interface FocusSessionResultProps {
  result: FinishFocusResultDTO;
  subjectName: string | null;
  topicName: string | null;
  onStartAnother: () => void;
}

/**
 * Resultado do encerramento (Fase 15 — UI, item 4 da tarefa). Puramente apresentacional — TODO
 * valor exibido (`scored`/`points`/`xp`/`reasonNotScored`/`elapsedSeconds`/`cyclesCompleted`) vem
 * pronto do SERVIDOR (`FinishFocusResultDTO`, resposta de `finishFocusSessionAction`); nenhum
 * ponto/XP é calculado aqui.
 *
 * Tom deliberadamente diferente entre os dois desfechos (CLAUDE.md §21): quando `scored`, uma
 * "vitória" sóbria (verde, Troféu — mesmo motivo de `@/components/lessons/victory-dialog.tsx`);
 * quando não, neutro/informativo — NUNCA vermelho/destrutivo, porque não pontuar não é um erro do
 * aluno (instrução da fase: exibir o motivo "sem culpar, informativo").
 */
export function FocusSessionResult({ result, subjectName, topicName, onStartAnother }: FocusSessionResultProps) {
  const { session, scored, points, xp, reasonNotScored } = result;

  return (
    <Card className={scored ? "border-success/40" : "border-border"}>
      <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <span
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full",
            scored ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {scored ? (
            <Trophy className="h-7 w-7" aria-hidden="true" />
          ) : (
            <Clock className="h-7 w-7" aria-hidden="true" />
          )}
        </span>

        <div className="space-y-1">
          <p className="text-foreground text-lg font-semibold">
            {scored ? "Pomodoro concluído!" : "Sessão registrada"}
          </p>
          <p className="text-muted-foreground max-w-md text-sm">
            {scored
              ? "Atividade real validada pelo servidor — sessão contabilizada."
              : (reasonNotScored ?? "Esta sessão não atingiu os critérios para pontuar desta vez.")}
          </p>
        </div>

        {scored ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="border-border bg-card flex flex-col items-center gap-1 rounded-lg border px-4 py-3">
              <Badge variant="outline" className="border-success/40 bg-success/10 text-success gap-1 font-semibold">
                {points.toLocaleString("pt-BR")} pts
              </Badge>
              <span className="text-muted-foreground text-xs">Pontos ganhos</span>
            </div>
            <div className="border-border bg-card flex flex-col items-center gap-1 rounded-lg border px-4 py-3">
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary gap-1 font-semibold">
                <Zap className="h-3 w-3" aria-hidden="true" />
                {xp.toLocaleString("pt-BR")} XP
              </Badge>
              <span className="text-muted-foreground text-xs">Experiência ganha</span>
            </div>
          </div>
        ) : null}

        <div className="text-muted-foreground grid w-full max-w-sm gap-1 text-left text-xs">
          <div className="flex justify-between gap-4">
            <span>Modo</span>
            <span className="text-foreground text-right font-medium">{FOCUS_MODE_LABEL[session.mode]}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Tempo ativo registrado</span>
            <span className="text-foreground text-right font-medium">
              {formatSecondsAsDuration(session.elapsedSeconds)}
            </span>
          </div>
          {subjectName ? (
            <div className="flex justify-between gap-4">
              <span>Matéria</span>
              <span className="text-foreground text-right font-medium">
                {subjectName}
                {topicName ? ` · ${topicName}` : ""}
              </span>
            </div>
          ) : null}
          {session.objective ? (
            <div className="flex justify-between gap-4">
              <span>Objetivo</span>
              <span className="text-foreground text-right font-medium">{session.objective}</span>
            </div>
          ) : null}
        </div>

        <Button type="button" onClick={onStartAnother}>
          <RotateCcw aria-hidden="true" />
          Iniciar nova sessão
        </Button>
      </CardContent>
    </Card>
  );
}
