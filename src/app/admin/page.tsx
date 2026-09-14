import type { Metadata } from "next";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserPlus,
  Clock,
  CheckCircle2,
  Target,
  TrendingUp,
  Gauge,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/shared/error-state";
import { StatCard } from "@/components/shared/stat-card";
import { AdminRankingBarChart } from "@/components/admin/charts/admin-ranking-bar-chart";
import { getAdminDashboardAction } from "@/server/actions/admin/dashboard";
import { formatMinutesAsDuration } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard administrativo",
};

/**
 * Dashboard administrativo (Fase 17 — item 2 da tarefa). Server Component: busca
 * `getAdminDashboardAction` no servidor e só repassa os dados prontos para os gráficos
 * (Client Components) — nenhum cálculo de métrica acontece aqui.
 */
export default async function AdminDashboardPage() {
  const result = await getAdminDashboardAction();

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <ErrorState
          title="Não foi possível carregar o dashboard"
          description={result.error.message}
        />
      </div>
    );
  }

  const dashboard = result.data;
  const generatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(dashboard.generatedAt));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="text-primary h-6 w-6" aria-hidden="true" />
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <p className="text-muted-foreground text-xs">Calculado em {generatedAt} (UTC)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de alunos"
          value={dashboard.totalStudents.toLocaleString("pt-BR")}
          icon={Users}
        />
        <StatCard
          title="Usuários ativos"
          value={dashboard.activeUsers.toLocaleString("pt-BR")}
          icon={UserCheck}
          hint="Contas habilitadas de todos os perfis"
        />
        <StatCard
          title="Novos usuários (30 dias)"
          value={dashboard.newUsersLast30Days.toLocaleString("pt-BR")}
          icon={UserPlus}
        />
        <StatCard
          title="Tempo médio de estudo"
          value={formatMinutesAsDuration(dashboard.averageStudyMinutesPerStudent)}
          icon={Clock}
          hint="Por aluno"
        />
        <StatCard
          title="Taxa de conclusão"
          value={`${Math.round(dashboard.completionRatePercent)}%`}
          icon={CheckCircle2}
          valueClassName="text-success"
        />
        <StatCard
          title="Aproveitamento médio"
          value={`${Math.round(dashboard.averagePerformancePercent)}%`}
          icon={Target}
        />
        <StatCard
          title="Retenção"
          value={`${Math.round(dashboard.retentionRatePercent)}%`}
          icon={TrendingUp}
        />
        <StatCard
          title="Engajamento"
          value={`${Math.round(dashboard.engagementScore)}%`}
          icon={Gauge}
          hint="Média das taxas de conclusão e retenção"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <CreditCard className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          <CardTitle>Assinaturas ativas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-2xl font-semibold tracking-tight">{dashboard.activeSubscriptions}</p>
          <p className="text-muted-foreground text-xs">Assinaturas pagas com acesso vigente.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Cursos com mais matrículas</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminRankingBarChart
              data={dashboard.topCourses.map((c) => ({ label: c.title, value: c.accessCount }))}
              valueLabel="Matrículas"
              color="var(--chart-1)"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Aulas com mais registros de progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminRankingBarChart
              data={dashboard.topLessons.map((l) => ({ label: l.title, value: l.viewCount }))}
              valueLabel="Registros de progresso"
              color="var(--chart-2)"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Simulados mais realizados</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminRankingBarChart
              data={dashboard.topMockExams.map((m) => ({ label: m.title, value: m.attemptCount }))}
              valueLabel="Tentativas"
              color="var(--chart-3)"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
