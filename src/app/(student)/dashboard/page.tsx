import type { Metadata } from "next";
import { BarChart3, BookOpen, ClipboardList, Clock, Percent, Trophy } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AchievementsList } from "@/components/dashboard/achievements-list";
import { ContinueMissionCard } from "@/components/dashboard/continue-mission-card";
import { GamificationPanel } from "@/components/dashboard/gamification-panel";
import { GoalsPanel } from "@/components/dashboard/goals-panel";
import { PerformanceSummaryCard } from "@/components/dashboard/performance-summary-card";
import { StudyHoursChart } from "@/components/charts/study-hours-chart";
import { SubjectPerformanceChart } from "@/components/charts/subject-performance-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatCard } from "@/components/shared/stat-card";
import { formatMinutesAsDuration } from "@/lib/utils";
import { getDashboardAction } from "@/server/actions/dashboard";

export const metadata: Metadata = { title: "Início" };

function getGreeting(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Dashboard do aluno (Fase 5). Server Component: busca o `DashboardDTO` já pronto via
 * `getDashboardAction` (fronteira de servidor — autenticação/autorização e agregação
 * ficam em `@/server/actions/dashboard` e `@/server/services/dashboard-service`) e só
 * renderiza. Nenhum cálculo de pontos/XP/ranking/tempo válido acontece aqui.
 */
export default async function DashboardPage() {
  const result = await getDashboardAction();

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Início" }]} />
        <ErrorState title="Não foi possível carregar seu painel" description={result.error.message} />
      </div>
    );
  }

  const dashboard = result.data;
  const firstName = dashboard.identity.studentName.split(" ")[0] || dashboard.identity.studentName;
  const greeting = getGreeting(new Date().getHours());

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Início" }]} />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {firstName}!
        </h1>
        <p className="text-muted-foreground text-sm">
          Concurso selecionado:{" "}
          <span className="text-foreground font-medium">{dashboard.identity.selectedContestName}</span>
        </p>
      </div>

      <GamificationPanel gamification={dashboard.gamification} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Tempo estudado na semana"
          value={formatMinutesAsDuration(dashboard.study.weeklyStudyMinutes)}
          icon={Clock}
        />
        <StatCard
          title="Aulas concluídas"
          value={dashboard.study.lessonsCompleted.toLocaleString("pt-BR")}
          icon={BookOpen}
        />
        <StatCard
          title="Simulados realizados"
          value={dashboard.study.mockExamsTaken.toLocaleString("pt-BR")}
          icon={ClipboardList}
        />
        <StatCard
          title="Percentual de acertos"
          value={`${Math.round(dashboard.study.accuracyPercent)}%`}
          icon={Percent}
        />
        <StatCard
          title="Posição no ranking"
          value={`#${dashboard.ranking.position.toLocaleString("pt-BR")}`}
          hint={`de ${dashboard.ranking.totalParticipants.toLocaleString("pt-BR")} participantes`}
          icon={Trophy}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContinueMissionCard nextLesson={dashboard.nextLesson} />
        </div>
        <GoalsPanel goals={dashboard.goals} />
      </div>

      <PerformanceSummaryCard summary={dashboard.performanceSummary} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Horas estudadas na semana</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.studyHoursSeries.length > 0 ? (
              <StudyHoursChart data={dashboard.studyHoursSeries} />
            ) : (
              <EmptyState icon={BarChart3} title="Sem dados de estudo esta semana" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por matéria</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.subjectPerformance.length > 0 ? (
              <SubjectPerformanceChart data={dashboard.subjectPerformance} />
            ) : (
              <EmptyState icon={BarChart3} title="Sem simulados respondidos ainda" />
            )}
          </CardContent>
        </Card>
      </div>

      <AchievementsList achievements={dashboard.recentAchievements} />
    </div>
  );
}
