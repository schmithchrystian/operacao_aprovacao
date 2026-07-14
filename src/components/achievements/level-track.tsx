import { Check, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FALLBACK_ICON, ICON_ALLOWLIST } from "@/components/shared/lucide-icon";
import type { LevelDefinition } from "@/server/services/gamification/levels";

interface LevelTrackProps {
  levels: readonly LevelDefinition[];
  currentLevelIndex: number;
}

type LevelTrackStatus = "reached" | "current" | "locked";

function getStatus(levelIndex: number, currentLevelIndex: number): LevelTrackStatus {
  if (levelIndex < currentLevelIndex) return "reached";
  if (levelIndex === currentLevelIndex) return "current";
  return "locked";
}

const STATUS_LABEL: Record<LevelTrackStatus, string> = {
  reached: "Alcançado",
  current: "Nível atual",
  locked: "Bloqueado",
};

/**
 * Trilha com os 7 níveis (Recruta -> Comandante, `@/server/services/gamification/levels`).
 * Server Component — recebe a lista estática de definições de nível e apenas o índice do
 * nível atual (já calculado por `computeLevel`, Fase 8 — agente `gamification`); não decide
 * nem calcula XP/progresso, só classifica cada item como alcançado/atual/bloqueado por
 * comparação de índice.
 *
 * O status nunca depende só de cor: cada item também traz um ícone (check/cadeado) e um
 * `Badge` textual, para permanecer legível a leitores de tela e em modo de alto contraste.
 */
export function LevelTrack({ levels, currentLevelIndex }: LevelTrackProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trilha de níveis</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {levels.map((level) => {
            const status = getStatus(level.index, currentLevelIndex);
            const LevelIcon = ICON_ALLOWLIST[level.icon] ?? FALLBACK_ICON;

            return (
              <li
                key={level.key}
                aria-current={status === "current" ? "step" : undefined}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-3 text-center",
                  status === "current" && "border-primary bg-primary/10",
                  status === "reached" && "border-success/40 bg-success/5",
                  status === "locked" && "border-border bg-card/40 opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    status === "current" && "bg-primary/15 text-primary",
                    status === "reached" && "bg-success/15 text-success",
                    status === "locked" && "bg-muted text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {status === "locked" ? <Lock className="h-4 w-4" /> : <LevelIcon className="h-4 w-4" />}
                </span>
                <p className="text-foreground text-xs font-semibold">{level.name}</p>
                <p className="text-muted-foreground text-[11px]">
                  {level.minXp.toLocaleString("pt-BR")} XP
                </p>
                <Badge
                  variant={status === "current" ? "default" : status === "reached" ? "secondary" : "outline"}
                  className="gap-1"
                >
                  {status === "reached" ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                  {STATUS_LABEL[status]}
                </Badge>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
