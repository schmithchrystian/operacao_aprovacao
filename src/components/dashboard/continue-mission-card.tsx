import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgressBar } from "@/components/shared/progress-bar";
import type { DashboardNextLesson } from "@/contracts/dashboard";

interface ContinueMissionCardProps {
  nextLesson: DashboardNextLesson | null;
}

/**
 * Card principal "Continue sua missão": próxima aula recomendada, com link direto para
 * ela. `nextLesson` é `null` quando não há recomendação disponível (Fase 7 — cursos)
 * — nesse caso mostra um estado vazio em vez de quebrar a página.
 */
export function ContinueMissionCard({ nextLesson }: ContinueMissionCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Continue sua missão</CardTitle>
      </CardHeader>
      <CardContent>
        {nextLesson ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {nextLesson.courseTitle}
              </p>
              <p className="text-foreground text-sm font-medium">{nextLesson.moduleTitle}</p>
              <p className="text-foreground text-base font-semibold">{nextLesson.lessonTitle}</p>
            </div>
            <ProgressBar value={nextLesson.progressPercent} label="Progresso no módulo" variant="success" />
            <Button render={<Link href={nextLesson.href} />}>
              Continuar estudando
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <EmptyState
            icon={Compass}
            title="Nenhuma aula recomendada no momento"
            description="Escolha um curso para recebermos sua próxima recomendação de estudo."
          />
        )}
      </CardContent>
    </Card>
  );
}
