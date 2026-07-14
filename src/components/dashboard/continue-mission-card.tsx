import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgressBar } from "@/components/shared/progress-bar";
import { cn } from "@/lib/utils";
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
            {/* Link de navegação com APARÊNCIA de botão: aplica `buttonVariants` direto no
                `<Link>` em vez de `<Button render={<Link/>}>`. O primitivo `Button` do Base UI
                é semanticamente um botão — via `render` de um `<a>` ele ou avisa no console
                (`nativeButton` default `true` vs. elemento não-`<button>`) ou, com
                `nativeButton={false}`, força `role="button"` num link (semântica errada p/ algo
                que NAVEGA). Aqui o elemento deve ser um link (role "link"), então o caminho
                correto é estilizar o `<Link>` — sem primitivo de botão, sem warning. Mesmo
                idioma já aplicado em todos os outros pontos do projeto que antes usavam
                `<Button render={<Link/>}>` (varredura de polimento — ver relatório). */}
            <Link href={nextLesson.href} className={cn(buttonVariants())}>
              Continuar estudando
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
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
