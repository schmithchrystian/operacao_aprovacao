import { Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { FALLBACK_ICON, ICON_ALLOWLIST } from "@/components/shared/lucide-icon";
import { formatDatePtBr } from "@/lib/utils";
import type { DashboardAchievement } from "@/contracts/dashboard";

interface AchievementsListProps {
  achievements: DashboardAchievement[];
}

/**
 * Últimas conquistas do aluno. Server Component — a lista definitiva vem de
 * `UserAchievement` (Fase 8 — agente `gamification`); aqui apenas exibe.
 */
export function AchievementsList({ achievements }: AchievementsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimas conquistas</CardTitle>
      </CardHeader>
      <CardContent>
        {achievements.length === 0 ? (
          <EmptyState
            icon={Award}
            title="Nenhuma conquista ainda"
            description="Continue estudando para desbloquear suas primeiras medalhas."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement) => {
              const Icon = ICON_ALLOWLIST[achievement.icon] ?? FALLBACK_ICON;
              return (
                <li
                  key={achievement.id}
                  className="border-border bg-card/40 flex items-center gap-3 rounded-lg border p-3"
                >
                  <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">{achievement.name}</p>
                    <p className="text-muted-foreground text-xs">{formatDatePtBr(achievement.achievedAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
