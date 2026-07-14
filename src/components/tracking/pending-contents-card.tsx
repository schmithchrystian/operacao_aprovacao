import { BookOpen, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { TrackingPendingContentDTO } from "@/contracts/tracking";

interface PendingContentsCardProps {
  items: TrackingPendingContentDTO[];
}

/**
 * Matérias sem NENHUM engajamento registrado ainda (nem questão respondida, nem tempo válido de
 * estudo) — já resolvido por `getTrackingOverview`; aqui só exibe. Lista vazia é um bom sinal,
 * por isso o `EmptyState` usa um ícone/tom positivo.
 */
export function PendingContentsCard({ items }: PendingContentsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <BookOpen className="text-primary h-4 w-4" aria-hidden="true" />
          Matérias pendentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Todas as matérias já têm algum estudo registrado" />
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <li key={item.subjectId}>
                <Badge variant="outline">{item.subjectName}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
