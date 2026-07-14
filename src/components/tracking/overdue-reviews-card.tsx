import { CalendarClock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDatePtBr } from "@/lib/utils";
import type { TrackingOverdueReviewDTO } from "@/contracts/tracking";

interface OverdueReviewsCardProps {
  items: TrackingOverdueReviewDTO[];
}

/**
 * Itens de revisão do plano de estudos com `targetDate` no passado e status ainda não terminal
 * (`getTrackingOverview` → `buildOverdueReviews`); aqui só exibe. Lista vazia é um bom sinal, por
 * isso o `EmptyState` usa um ícone/tom positivo.
 */
export function OverdueReviewsCard({ items }: OverdueReviewsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="text-destructive h-4 w-4" aria-hidden="true" />
          Revisões atrasadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nenhuma revisão atrasada" />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.itemId} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.subjectName ? `${item.subjectName} · ` : ""}
                    Prevista para {formatDatePtBr(item.targetDate)}
                  </p>
                </div>
                <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive shrink-0">
                  {item.daysLate} {item.daysLate === 1 ? "dia" : "dias"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
