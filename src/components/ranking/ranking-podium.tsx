import { Crown, Medal, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RankingListEntryDTO } from "@/server/services/gamification";
import { RankingAvatar } from "./ranking-avatar";

interface RankingPodiumProps {
  entries: RankingListEntryDTO[];
}

const RANK_STYLE: Record<
  1 | 2 | 3,
  { icon: LucideIcon; badgeClass: string; cardClass: string; order: string; label: string }
> = {
  1: {
    icon: Crown,
    badgeClass: "bg-primary text-primary-foreground",
    cardClass: "sm:-translate-y-3 ring-2 ring-primary/60",
    order: "order-1 sm:order-2",
    label: "1º lugar",
  },
  2: {
    icon: Medal,
    badgeClass: "bg-muted text-foreground",
    cardClass: "ring-1 ring-border",
    order: "order-2 sm:order-1",
    label: "2º lugar",
  },
  3: {
    icon: Medal,
    badgeClass: "bg-primary/10 text-primary",
    cardClass: "ring-1 ring-border",
    order: "order-3 sm:order-3",
    label: "3º lugar",
  },
};

function PodiumCard({ entry, rank }: { entry: RankingListEntryDTO; rank: 1 | 2 | 3 }) {
  const style = RANK_STYLE[rank];
  const Icon = style.icon;

  return (
    <Card className={cn("items-center text-center", style.cardClass, style.order, entry.isCurrentUser && "ring-2 ring-primary")}>
      <CardContent className="flex flex-col items-center gap-2">
        <span
          className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", style.badgeClass)}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {rank}º
        </span>
        <RankingAvatar name={entry.displayName} avatarUrl={entry.avatarUrl} size="lg" />
        <div className="space-y-0.5">
          <p className="flex items-center justify-center gap-1.5 font-semibold">
            <span className="truncate">{entry.displayName}</span>
            {entry.isCurrentUser ? (
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                Você
              </Badge>
            ) : null}
          </p>
          <p className="text-muted-foreground text-xs">
            Nível {entry.level.index} — {entry.level.name}
          </p>
        </div>
        <p className="text-lg font-bold tracking-tight">
          {entry.points.toLocaleString("pt-BR")}{" "}
          <span className="text-muted-foreground text-xs font-normal">pontos</span>
        </p>
        <span className="sr-only">{style.label}</span>
      </CardContent>
    </Card>
  );
}

/**
 * Pódio dos 3 primeiros colocados. Recebe `top3` já ordenado e filtrado (privacidade/opt-out)
 * pelo backend (`getRanking`) — nenhum cálculo/ordenação acontece aqui. Renderiza apenas os
 * lugares realmente presentes (escopos novos podem ter menos de 3 participantes).
 */
export function RankingPodium({ entries }: RankingPodiumProps) {
  const first = entries.find((entry) => entry.position === 1);
  const second = entries.find((entry) => entry.position === 2);
  const third = entries.find((entry) => entry.position === 3);

  if (!first && !second && !third) {
    return null;
  }

  return (
    <section aria-labelledby="ranking-podio-heading" className="space-y-3">
      <h2 id="ranking-podio-heading" className="text-lg font-semibold tracking-tight">
        Pódio
      </h2>
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
        {second ? <PodiumCard entry={second} rank={2} /> : <div className="hidden sm:order-1 sm:block" />}
        {first ? <PodiumCard entry={first} rank={1} /> : <div className="hidden sm:order-2 sm:block" />}
        {third ? <PodiumCard entry={third} rank={3} /> : <div className="hidden sm:order-3 sm:block" />}
      </div>
    </section>
  );
}
