import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/shared/progress-bar";
import { XpBadge } from "@/components/shared/xp-badge";
import { FALLBACK_ICON, ICON_ALLOWLIST } from "@/components/shared/lucide-icon";
import type { ComputedLevel } from "@/server/services/gamification/levels";

interface LevelHeaderProps {
  computedLevel: ComputedLevel;
  points: number;
  xp: number;
}

/**
 * Cabeçalho de nível da página de Conquistas: nível atual (ícone + nome), XP, pontos,
 * benefício visual do nível e progresso até o próximo (ou aviso de nível máximo no
 * Comandante). Server Component — apenas exibe o `ComputedLevel` já calculado por
 * `computeLevel` (`@/server/services/gamification/levels`, Fase 8 — agente `gamification`);
 * nenhum cálculo de XP/nível acontece aqui.
 */
export function LevelHeader({ computedLevel, points, xp }: LevelHeaderProps) {
  const { level, nextLevelXp, progressPercent, xpToNextLevel } = computedLevel;
  const LevelIcon = ICON_ALLOWLIST[level.icon] ?? FALLBACK_ICON;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <span
            className="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            <LevelIcon className="h-6 w-6" />
          </span>
          <div>
            <CardTitle className="text-lg">
              Nível {level.index} — {level.name}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{level.benefit}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <XpBadge value={xp} />
          <span className="text-muted-foreground text-sm font-medium">
            {points.toLocaleString("pt-BR")} pontos
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {nextLevelXp === null ? (
          <p className="text-muted-foreground text-sm" role="status">
            Nível máximo atingido — continue estudando para se manter no topo do ranking.
          </p>
        ) : (
          <ProgressBar
            value={progressPercent}
            label={`Faltam ${(xpToNextLevel ?? 0).toLocaleString("pt-BR")} XP para o próximo nível`}
            variant="success"
          />
        )}
      </CardContent>
    </Card>
  );
}
