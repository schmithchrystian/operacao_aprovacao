import { CheckCircle2, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { TrackingWeakContentDTO } from "@/contracts/tracking";

interface WeakContentsCardProps {
  items: TrackingWeakContentDTO[];
}

/**
 * Conteúdos (matéria, ou assunto quando `topicId` existe) com aproveitamento abaixo do limiar
 * configurado no backend (`STUDY_TRACKING_OVERVIEW.weakSubjectAccuracyThreshold`) — já
 * filtrado/ordenado por `getTrackingOverview`; aqui só exibe. Lista vazia é um bom sinal (nenhum
 * conteúdo fraco identificado), por isso o `EmptyState` usa um ícone/tom positivo.
 */
export function WeakContentsCard({ items }: WeakContentsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <TrendingDown className="text-destructive h-4 w-4" aria-hidden="true" />
          Conteúdos fracos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nenhum conteúdo fraco identificado" />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={`${item.subjectId}-${item.topicId ?? "subject"}`}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {item.topicName ?? item.subjectName}
                  {item.topicName ? <span className="text-muted-foreground"> · {item.subjectName}</span> : null}
                </span>
                <Badge
                  variant="outline"
                  className="border-destructive/40 bg-destructive/10 text-destructive shrink-0"
                >
                  {Math.round(item.accuracyPercent)}%
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
