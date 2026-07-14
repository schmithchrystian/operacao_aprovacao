import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDatePtBr } from "@/lib/utils";
import { FALLBACK_ICON, ICON_ALLOWLIST } from "@/components/shared/lucide-icon";
import type { UserAchievementView } from "@/server/services/gamification/read";

interface AchievementCardProps {
  achievement: UserAchievementView;
}

/**
 * Cartão de uma conquista (desbloqueada ou bloqueada). Server Component — apenas exibe o
 * `UserAchievementView` já resolvido por `getUserGamification` (Fase 8 — agente
 * `gamification`): nome, descrição/critério, ícone e, se desbloqueada, a data.
 *
 * O estado desbloqueado/bloqueado nunca depende só de cor: usa opacidade + um `Badge`
 * textual + o próprio ícone (cadeado quando bloqueada), para permanecer acessível.
 */
export function AchievementCard({ achievement }: AchievementCardProps) {
  const { name, description, icon, unlocked, unlockedAt } = achievement;
  const Icon = ICON_ALLOWLIST[icon] ?? FALLBACK_ICON;

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        unlocked ? "border-primary/30 bg-primary/5" : "border-border bg-card/40 opacity-70",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="text-foreground text-sm font-medium">{name}</p>
          <Badge variant={unlocked ? "secondary" : "outline"} className="shrink-0">
            {unlocked ? "Desbloqueada" : "Bloqueada"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">{description}</p>
        {unlocked && unlockedAt ? (
          <p className="text-muted-foreground text-[11px]">Desbloqueada em {formatDatePtBr(unlockedAt)}</p>
        ) : null}
      </div>
    </li>
  );
}
