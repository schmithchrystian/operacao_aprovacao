"use client";

import Link from "next/link";
import { ArrowRight, Star, Trophy, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/shared/progress-bar";
import type { LessonCompletionDTO } from "@/contracts/progress";

interface VictoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completion: LessonCompletionDTO | null;
  nextLessonHref: string | null;
  nextLessonTitle: string | null;
  courseTrackHref: string;
}

/**
 * Tela de "Vitória conquistada" (CLAUDE.md §1/§21): exibida quando o heartbeat cruza o
 * limiar de conclusão pela primeira vez (`HeartbeatResultDTO.justCompleted`). Todo valor
 * exibido vem pronto do `LessonCompletionDTO` — nenhum ponto/XP/progresso é calculado
 * aqui. Estilo arcade discreto: verde de vitória, sem confete/animação exagerada
 * (CLAUDE.md §21, "evitar animações excessivas").
 */
export function VictoryDialog({
  open,
  onOpenChange,
  completion,
  nextLessonHref,
  nextLessonTitle,
  courseTrackHref,
}: VictoryDialogProps) {
  if (!completion) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="victory-dialog-description">
        <DialogHeader>
          <span className="bg-success/10 text-success flex h-14 w-14 items-center justify-center rounded-full">
            <Trophy className="h-7 w-7" aria-hidden="true" />
          </span>
          <DialogTitle>Vitória conquistada!</DialogTitle>
          <DialogDescription id="victory-dialog-description">
            Você concluiu a aula <span className="text-foreground font-medium">{completion.lessonTitle}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="border-border bg-card flex flex-col items-center gap-1 rounded-lg border py-3">
            <Badge variant="outline" className="border-success/40 bg-success/10 text-success gap-1 font-semibold">
              <Star className="h-3 w-3" aria-hidden="true" />
              {completion.points.toLocaleString("pt-BR")} pts
            </Badge>
            <span className="text-muted-foreground text-xs">Pontos ganhos</span>
          </div>
          <div className="border-border bg-card flex flex-col items-center gap-1 rounded-lg border py-3">
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary gap-1 font-semibold">
              <Zap className="h-3 w-3" aria-hidden="true" />
              {completion.xp.toLocaleString("pt-BR")} XP
            </Badge>
            <span className="text-muted-foreground text-xs">Experiência ganha</span>
          </div>
        </div>

        <div className="space-y-3">
          <ProgressBar value={completion.moduleProgressPercent} label="Progresso no módulo" variant="success" />
          <ProgressBar value={completion.courseProgressPercent} label="Progresso no curso" variant="success" />
        </div>

        {/* TODO(Fase 8 — gamification): achievementUnlocked ainda é sempre `null` neste
            contrato (src/contracts/progress.ts) — quando a fórmula de conquistas existir,
            renderizar o badge de conquista aqui. */}

        <DialogFooter>
          <Button variant="outline" render={<Link href={courseTrackHref} />}>
            Voltar à trilha
          </Button>
          {nextLessonHref ? (
            <Button render={<Link href={nextLessonHref} />}>
              {nextLessonTitle ? `Próxima aula: ${nextLessonTitle}` : "Próxima aula"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
