import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, BookOpen, CalendarClock, Clock, Flame, ListOrdered, Percent, Timer } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatCard } from "@/components/shared/stat-card";
import { AccuracyBreakdownChart } from "@/components/charts/accuracy-breakdown-chart";
import { ConsistencyChart } from "@/components/charts/consistency-chart";
import { EvolutionChart } from "@/components/charts/evolution-chart";
import { ExamProgressChart } from "@/components/charts/exam-progress-chart";
import { SubjectPerformanceChart } from "@/components/charts/subject-performance-chart";
import { TimeDistributionChart } from "@/components/charts/time-distribution-chart";
import { DiagnosisPanel } from "@/components/tracking/diagnosis-panel";
import { formatAverageSeconds, formatMonthLabel, formatWeekLabel } from "@/components/tracking/labels";
import { OverdueReviewsCard } from "@/components/tracking/overdue-reviews-card";
import { PendingContentsCard } from "@/components/tracking/pending-contents-card";
import { WeakContentsCard } from "@/components/tracking/weak-contents-card";
import { cn, formatMinutesAsDuration } from "@/lib/utils";
import { getDiagnosisAction, getTrackingOverviewAction } from "@/server/actions/tracking";

export const metadata: Metadata = { title: "Acompanhamento" };

const BREADCRUMBS = [{ label: "Início", href: "/dashboard" }, { label: "Acompanhamento" }];

/**
 * Acompanhamento e diagnóstico de preparação (Fase 12 — UI). Server Component: busca
 * `TrackingOverviewDTO`/`DiagnosisDTO` já prontos via `getTrackingOverviewAction`/
 * `getDiagnosisAction` (fronteira de servidor — agregação e heurística ficam inteiramente em
 * `@/server/services/study-tracking/*`) e só renderiza. Nenhuma hora/desempenho/risco é
 * calculado aqui — gráficos e listas só desenham o que o backend já decidiu.
 *
 * Cada seção trata sua própria ausência de dados com `EmptyState` (comum num usuário novo,
 * "mock frio": tudo zerado ainda é um estado válido, não um erro) — os cartões de métrica
 * continuam mostrando "0" normalmente, já que zero é um valor informativo aqui.
 */
export default async function AcompanhamentoPage() {
  const [overviewResult, diagnosisResult] = await Promise.all([getTrackingOverviewAction(), getDiagnosisAction()]);

  if (!overviewResult.ok) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={BREADCRUMBS} />
        <ErrorState title="Não foi possível carregar seu acompanhamento" description={overviewResult.error.message} />
      </div>
    );
  }

  const overview = overviewResult.data;

  const weeklyEvolutionData = overview.weeklyEvolution.map((point) => ({
    id: point.weekStart,
    label: formatWeekLabel(point.weekStart),
    minutes: point.minutes,
  }));
  const monthlyEvolutionData = overview.monthlyEvolution.map((point) => ({
    id: point.month,
    label: formatMonthLabel(point.month),
    minutes: point.minutes,
  }));
  const subjectPerformanceData = overview.subjectPerformance.map((entry) => ({
    subject: entry.subjectName,
    accuracyPercent: entry.accuracyPercent,
  }));

  const { examDate, daysUntilExam, planProgressPercent, expectedProgressPercent } = overview.examProgress;
  const hasExamProgress = examDate !== null && planProgressPercent !== null && expectedProgressPercent !== null;
  const delayRisk = diagnosisResult.ok ? diagnosisResult.data.delayRisk : "LOW";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={BREADCRUMBS} />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Acompanhamento</h1>
        <p className="text-muted-foreground text-sm">
          Tempo de estudo, desempenho em questões e diagnóstico de preparação para a prova.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Estudo hoje" value={formatMinutesAsDuration(overview.hours.todayMinutes)} icon={Clock} />
        <StatCard
          title="Estudo na semana"
          value={formatMinutesAsDuration(overview.hours.weekMinutes)}
          icon={Clock}
        />
        <StatCard title="Estudo no mês" value={formatMinutesAsDuration(overview.hours.monthMinutes)} icon={Clock} />
        <StatCard
          title="Aulas concluídas"
          value={overview.lessonsCompleted.toLocaleString("pt-BR")}
          icon={BookOpen}
        />
        <StatCard
          title="Questões respondidas"
          value={overview.questions.totalAnswered.toLocaleString("pt-BR")}
          icon={ListOrdered}
        />
        <StatCard
          title="Percentual de acertos"
          value={`${Math.round(overview.questions.accuracyPercent)}%`}
          icon={Percent}
        />
        <StatCard
          title="Tempo médio por questão"
          value={
            overview.questions.averageSecondsPerQuestion === null
              ? "—"
              : formatAverageSeconds(overview.questions.averageSecondsPerQuestion)
          }
          hint={overview.questions.averageSecondsPerQuestion === null ? "Sem questões respondidas ainda" : undefined}
          icon={Timer}
        />
        <StatCard
          title="Sequência atual"
          value={`${overview.streak.currentStreak} ${overview.streak.currentStreak === 1 ? "dia" : "dias"}`}
          hint={`Maior sequência: ${overview.streak.longestStreak} ${overview.streak.longestStreak === 1 ? "dia" : "dias"}`}
          icon={Flame}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução semanal</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyEvolutionData.length > 0 ? (
              <EvolutionChart data={weeklyEvolutionData} periodLabel="semana" />
            ) : (
              <EmptyState icon={BarChart3} title="Sem dados suficientes ainda" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Evolução mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyEvolutionData.length > 0 ? (
              <EvolutionChart data={monthlyEvolutionData} periodLabel="mês" />
            ) : (
              <EmptyState icon={BarChart3} title="Sem dados suficientes ainda" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por matéria</CardTitle>
          </CardHeader>
          <CardContent>
            {subjectPerformanceData.length > 0 ? (
              <SubjectPerformanceChart data={subjectPerformanceData} />
            ) : (
              <EmptyState icon={BarChart3} title="Sem questões respondidas ainda" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de tempo por matéria</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.timeDistribution.length > 0 ? (
              <TimeDistributionChart data={overview.timeDistribution} />
            ) : (
              <EmptyState icon={BarChart3} title="Sem tempo de estudo registrado ainda" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Acertos vs. erros</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.questions.totalAnswered > 0 ? (
              <AccuracyBreakdownChart data={overview.questions} />
            ) : (
              <EmptyState icon={BarChart3} title="Sem questões respondidas ainda" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Consistência</CardTitle>
          </CardHeader>
          <CardContent>
            <ConsistencyChart data={overview.consistency} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progresso até a prova</CardTitle>
        </CardHeader>
        <CardContent>
          {hasExamProgress ? (
            <div className="space-y-3">
              {daysUntilExam !== null ? (
                <p className="text-muted-foreground text-sm">
                  {daysUntilExam >= 0
                    ? `Faltam ${daysUntilExam} dia(s) para a prova.`
                    : `A data da prova já passou há ${Math.abs(daysUntilExam)} dia(s).`}
                </p>
              ) : null}
              <ExamProgressChart
                planProgressPercent={planProgressPercent}
                expectedProgressPercent={expectedProgressPercent}
                delayRisk={delayRisk}
              />
            </div>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="Nenhuma data de prova definida"
              description="Defina a data da prova no plano de estudos para acompanhar o progresso esperado até lá."
              action={
                <Link href="/plano-de-estudos" className={cn(buttonVariants({ variant: "outline" }))}>
                  Ir para o plano de estudos
                </Link>
              }
            />
          )}
        </CardContent>
      </Card>

      {diagnosisResult.ok ? (
        <DiagnosisPanel diagnosis={diagnosisResult.data} />
      ) : (
        <ErrorState
          title="Não foi possível carregar o diagnóstico de preparação"
          description={diagnosisResult.error.message}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <WeakContentsCard items={overview.weakContents} />
        <PendingContentsCard items={overview.pendingContents} />
        <OverdueReviewsCard items={overview.overdueReviews} />
      </div>
    </div>
  );
}
