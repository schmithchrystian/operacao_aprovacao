import { CalendarRange, CheckCircle2, type LucideIcon, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/shared/progress-bar";
import type { DashboardGoal, DashboardGoals } from "@/contracts/dashboard";

interface GoalsPanelProps {
  goals: DashboardGoals;
}

interface GoalCardProps {
  icon: LucideIcon;
  title: string;
  goal: DashboardGoal;
}

function GoalCard({ icon: Icon, title, goal }: GoalCardProps) {
  const percent = goal.target > 0 ? (goal.progress / goal.target) * 100 : 0;

  return (
    <div className="border-border space-y-2 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="text-primary h-4 w-4" aria-hidden="true" />
          {title}
        </div>
        {goal.completed ? (
          <Badge variant="outline" className="border-success/40 bg-success/10 text-success gap-1">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Concluída
          </Badge>
        ) : null}
      </div>
      <p className="text-muted-foreground text-sm">{goal.description}</p>
      <ProgressBar
        value={percent}
        label={`${goal.progress.toLocaleString("pt-BR")} / ${goal.target.toLocaleString("pt-BR")} ${goal.unit}`}
        variant={goal.completed ? "success" : "default"}
      />
    </div>
  );
}

/**
 * Missão diária e meta semanal do dashboard. Server Component — alvo/progresso já
 * pré-computados pelo backend (Fase 8/12); apenas exibe.
 */
export function GoalsPanel({ goals }: GoalsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Missões</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoalCard icon={Target} title="Missão diária" goal={goals.daily} />
        <GoalCard icon={CalendarRange} title="Meta semanal" goal={goals.weekly} />
      </CardContent>
    </Card>
  );
}
