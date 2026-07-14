import { Clock, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StartCatalogExamButton } from "@/components/simulations/start-catalog-exam-button";
import type { MockExamCatalogItemDTO } from "@/contracts/simulations";

interface CatalogExamCardProps {
  exam: MockExamCatalogItemDTO;
}

/**
 * Cartão de um simulado pronto do catálogo ("completo" ou "por matéria" pré-montado). Server
 * Component — só o botão "Iniciar" precisa de interatividade (`StartCatalogExamButton`).
 */
export function CatalogExamCard({ exam }: CatalogExamCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between">
      <CardHeader>
        <CardTitle>{exam.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {exam.description ? <p className="text-muted-foreground text-sm">{exam.description}</p> : null}
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            {exam.questionCount.toLocaleString("pt-BR")} questões
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {exam.durationMinutes} min
          </span>
        </div>
        <div className="mt-auto pt-2">
          <StartCatalogExamButton mockExamId={exam.id} />
        </div>
      </CardContent>
    </Card>
  );
}
