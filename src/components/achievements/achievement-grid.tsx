import { Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { AchievementCard } from "@/components/achievements/achievement-card";
import type { UserAchievementView } from "@/server/services/gamification/read";

interface AchievementGridProps {
  achievements: UserAchievementView[];
}

/**
 * Grade com todas as conquistas (~18, `@/server/services/gamification/achievements`),
 * separadas em desbloqueadas e bloqueadas. Server Component — apenas exibe a lista já
 * resolvida por `getUserGamification` (Fase 8 — agente `gamification`); nenhum critério de
 * desbloqueio é avaliado aqui.
 */
export function AchievementGrid({ achievements }: AchievementGridProps) {
  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conquistas</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Award}
            title="Nenhuma conquista disponível"
            description="Ainda não há conquistas cadastradas para exibir."
          />
        </CardContent>
      </Card>
    );
  }

  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const locked = achievements.filter((achievement) => !achievement.unlocked);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conquistas</CardTitle>
        <p className="text-muted-foreground text-sm">
          {unlocked.length} de {achievements.length} desbloqueadas
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <section aria-labelledby="achievements-unlocked-heading" className="space-y-3">
          <h3 id="achievements-unlocked-heading" className="text-foreground text-sm font-semibold">
            Desbloqueadas ({unlocked.length})
          </h3>
          {unlocked.length === 0 ? (
            <EmptyState
              icon={Award}
              title="Nenhuma conquista desbloqueada ainda"
              description="Continue estudando para desbloquear suas primeiras medalhas."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {unlocked.map((achievement) => (
                <AchievementCard key={achievement.key} achievement={achievement} />
              ))}
            </ul>
          )}
        </section>

        {locked.length > 0 ? (
          <section aria-labelledby="achievements-locked-heading" className="space-y-3">
            <h3 id="achievements-locked-heading" className="text-foreground text-sm font-semibold">
              Bloqueadas ({locked.length})
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {locked.map((achievement) => (
                <AchievementCard key={achievement.key} achievement={achievement} />
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
