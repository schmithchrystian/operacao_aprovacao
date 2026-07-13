import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/shared/progress-bar";
import { XpBadge } from "@/components/shared/xp-badge";
import type { DashboardGamification } from "@/contracts/dashboard";

interface GamificationPanelProps {
  gamification: DashboardGamification;
}

interface LevelProgress {
  percent: number;
  xpRemaining: number;
}

/**
 * Progresso até o próximo nível (apenas apresentação). `null` quando o aluno já está
 * no nível máximo (Comandante) — `nextLevelXp` é `null` nesse caso (ver `dashboard.ts`).
 */
function computeLevelProgress(gamification: DashboardGamification): LevelProgress | null {
  const { xp, currentLevelXp, nextLevelXp } = gamification;
  if (nextLevelXp === null) {
    return null;
  }

  const span = Math.max(1, nextLevelXp - currentLevelXp);
  return {
    percent: ((xp - currentLevelXp) / span) * 100,
    xpRemaining: Math.max(0, nextLevelXp - xp),
  };
}

/**
 * Bloco de gamificação do dashboard: nível, XP, pontos, sequência de dias e progresso
 * até o próximo nível. Server Component — apenas exibe valores já pré-computados pelo
 * backend (Fase 8 — agente `gamification`); nenhum cálculo de pontos/XP acontece aqui.
 */
export function GamificationPanel({ gamification }: GamificationPanelProps) {
  const { level, points, xp, streakDays } = gamification;
  const levelProgress = computeLevelProgress(gamification);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>
            Nível {level.index} — {level.name}
          </CardTitle>
          <XpBadge value={xp} />
        </div>
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <Flame className="text-primary h-4 w-4" aria-hidden="true" />
            {streakDays} {streakDays === 1 ? "dia seguido" : "dias seguidos"}
          </span>
          <span className="font-medium">{points.toLocaleString("pt-BR")} pontos</span>
        </div>
      </CardHeader>
      <CardContent>
        {levelProgress === null ? (
          <p className="text-muted-foreground text-sm">
            Nível máximo atingido — continue estudando para se manter no topo do ranking.
          </p>
        ) : (
          <ProgressBar
            value={levelProgress.percent}
            label={`Faltam ${levelProgress.xpRemaining.toLocaleString("pt-BR")} XP para o próximo nível`}
            variant="success"
          />
        )}
      </CardContent>
    </Card>
  );
}
