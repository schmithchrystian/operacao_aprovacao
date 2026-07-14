import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarChart3, Lightbulb, ListX } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { AttemptPerformanceChart } from "@/components/charts/attempt-performance-chart";
import { AttemptTerminalState } from "@/components/simulations/attempt-terminal-state";
import { QuestionReviewList } from "@/components/simulations/question-review-list";
import { ResultSummary } from "@/components/simulations/result-summary";
import { formatDatePtBr } from "@/lib/utils";
import { getAttemptStatusAction, getResultAction } from "@/server/actions/simulations";

export const metadata: Metadata = { title: "Resultado do simulado" };

interface ResultPageProps {
  params: Promise<{ attemptId: string }>;
}

const BASE_BREADCRUMBS = [
  { label: "Início", href: "/dashboard" },
  { label: "Simulados", href: "/simulados" },
];

/**
 * Resultado de um simulado já corrigido (Fase 10 — UI). Server Component: busca
 * `AttemptResultDTO` (gabarito + explicação + métricas liberados, tentativa `FINISHED`) via
 * `getResultAction` e só renderiza — nota/acertos/desempenho por matéria-assunto/evolução são
 * sempre calculados no backend (`buildAttemptResultDTO`).
 *
 * Roteamento por STATUS EXPLÍCITO (correção de segurança Fase 10 — MÉDIO): num `CONFLICT`
 * (tentativa não `FINISHED`), consultamos o status real. Só `IN_PROGRESS` volta à resolução;
 * `EXPIRED`/`CANCELLED` renderizam o estado terminal AQUI, sem redirecionar de volta à resolução
 * (que redirecionaria de volta para cá — o loop de `ERR_TOO_MANY_REDIRECTS` que existia antes).
 */
export default async function AttemptResultPage({ params }: ResultPageProps) {
  const { attemptId } = await params;
  const result = await getResultAction({ attemptId });

  if (!result.ok) {
    if (result.error.code === "NOT_FOUND") {
      notFound();
    }
    if (result.error.code === "CONFLICT") {
      const statusResult = await getAttemptStatusAction({ attemptId });
      if (statusResult.ok) {
        if (statusResult.data.status === "IN_PROGRESS") {
          redirect(`/simulados/${attemptId}`);
        }
        // EXPIRED / CANCELLED → estado terminal, NUNCA redirecionar de volta.
        return (
          <div className="space-y-4">
            <Breadcrumbs
              items={[...BASE_BREADCRUMBS, { label: statusResult.data.mockExamTitle ?? "Tentativa" }]}
            />
            <AttemptTerminalState attempt={statusResult.data} />
          </div>
        );
      }
      if (statusResult.error.code === "NOT_FOUND") {
        notFound();
      }
    }

    return (
      <div className="space-y-6">
        <Breadcrumbs items={[...BASE_BREADCRUMBS, { label: "Resultado" }]} />
        <ErrorState title="Não foi possível carregar o resultado" description={result.error.message} />
      </div>
    );
  }

  const data = result.data;
  const bySubjectData = data.bySubject.map((entry) => ({
    label: entry.subjectName,
    accuracyPercent: entry.accuracyPercent,
  }));
  const byTopicData = data.byTopic.map((entry) => ({
    label: entry.topicName,
    accuracyPercent: entry.accuracyPercent,
  }));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[...BASE_BREADCRUMBS, { label: data.mockExamTitle ?? "Resultado" }]} />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{data.mockExamTitle ?? "Resultado do simulado"}</h1>
        <p className="text-muted-foreground text-sm">
          Finalizado em {formatDatePtBr(data.finishedAt)} · {data.totalQuestions} questões
        </p>
      </div>

      <ResultSummary result={data} />

      {data.suggestions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
              Sugestões de estudo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {data.suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por matéria</CardTitle>
          </CardHeader>
          <CardContent>
            {bySubjectData.length > 0 ? (
              <AttemptPerformanceChart data={bySubjectData} entityLabel="matéria" />
            ) : (
              <EmptyState icon={BarChart3} title="Sem dados por matéria" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por assunto</CardTitle>
          </CardHeader>
          <CardContent>
            {byTopicData.length > 0 ? (
              <AttemptPerformanceChart data={byTopicData} entityLabel="assunto" />
            ) : (
              <EmptyState icon={BarChart3} title="Sem dados por assunto" />
            )}
          </CardContent>
        </Card>
      </div>

      {data.wrongCount > 0 ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <ListX className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-sm">
                As {data.wrongCount} questões erradas desta tentativa já foram adicionadas ao seu caderno de erros.
              </p>
            </div>
            <Button variant="outline" render={<Link href="/simulados/caderno-de-erros" />}>
              Ver caderno de erros
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Gabarito e explicações</h2>
        <QuestionReviewList questions={data.questions} />
      </div>
    </div>
  );
}
