import type { Metadata } from "next";
import { BookMarked, FileCheck2, History, ListX, Star } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CatalogExamCard } from "@/components/simulations/catalog-exam-card";
import { MockExamBuilderForm } from "@/components/simulations/mock-exam-builder-form";
import { SimuladosHubLinkCard } from "@/components/simulations/simulados-hub-link-card";
import { listCoursesAction } from "@/server/actions/courses";
import {
  getErrorNotebookAction,
  getHistoryAction,
  listFavoritesAction,
  listMockExamCatalogAction,
  listSubjectOptionsAction,
} from "@/server/actions/simulations";

export const metadata: Metadata = { title: "Simulados" };

const BREADCRUMBS = [{ label: "Início", href: "/dashboard" }, { label: "Simulados" }];

/**
 * Hub de simulados (Fase 10 — UI do agente `frontend`). Server Component: busca tudo em
 * paralelo e só renderiza — a montagem de tentativa (`createAttemptAction`), o catálogo e as
 * listagens de histórico/caderno de erros/favoritos são sempre resolvidos no servidor
 * (`@/server/actions/simulations`). Cursos/matérias aqui servem só para popular os filtros do
 * formulário de montagem — dados públicos de catálogo, sem cálculo de negócio nesta página.
 */
export default async function SimuladosPage() {
  const [catalogResult, coursesResult, subjectsResult, historyResult, notebookResult, favoritesResult] =
    await Promise.all([
      listMockExamCatalogAction(),
      listCoursesAction(),
      listSubjectOptionsAction(),
      getHistoryAction(),
      getErrorNotebookAction(),
      listFavoritesAction(),
    ]);

  const courses = coursesResult.ok ? coursesResult.data : [];
  const contests = Array.from(new Map(courses.map((course) => [course.contestId, course.contestName])).entries()).map(
    ([id, name]) => ({ id, name }),
  );
  const courseOptions = courses.map((course) => ({ id: course.id, title: course.title, contestId: course.contestId }));
  const subjects = subjectsResult.ok ? subjectsResult.data : [];

  const historyCount = historyResult.ok ? historyResult.data.length : 0;
  const notebookCount = notebookResult.ok ? notebookResult.data.length : 0;
  const favoritesCount = favoritesResult.ok ? favoritesResult.data.length : 0;

  return (
    <div className="space-y-8">
      <div>
        <Breadcrumbs items={BREADCRUMBS} />
        <h1 className="text-2xl font-semibold tracking-tight">Simulados</h1>
        <p className="text-muted-foreground text-sm">
          Treine com simulados prontos do catálogo ou monte o seu por concurso, curso, matéria, banca e
          dificuldade.
        </p>
      </div>

      <section aria-labelledby="simulados-progresso" className="space-y-3">
        <h2 id="simulados-progresso" className="sr-only">
          Seu progresso em simulados
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <SimuladosHubLinkCard
            href="/simulados/historico"
            icon={History}
            title="Histórico"
            description="Suas tentativas anteriores"
            count={historyCount}
            countLabel="tentativas"
          />
          <SimuladosHubLinkCard
            href="/simulados/caderno-de-erros"
            icon={ListX}
            title="Caderno de erros"
            description="Questões que você já errou"
            count={notebookCount}
            countLabel="questões"
          />
          <SimuladosHubLinkCard
            href="/simulados/favoritos"
            icon={Star}
            title="Favoritos"
            description="Questões marcadas para revisar"
            count={favoritesCount}
            countLabel="questões"
          />
        </div>
      </section>

      <section aria-labelledby="simulados-catalogo" className="space-y-3">
        <h2 id="simulados-catalogo" className="text-lg font-semibold tracking-tight">
          Simulados prontos
        </h2>
        {!catalogResult.ok ? (
          <ErrorState title="Não foi possível carregar o catálogo" description={catalogResult.error.message} />
        ) : catalogResult.data.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="Nenhum simulado publicado ainda"
            description="Monte um simulado personalizado abaixo enquanto o catálogo é preparado."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {catalogResult.data.map((exam) => (
              <CatalogExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="simulados-montar" className="space-y-3">
        <h2 id="simulados-montar" className="text-lg font-semibold tracking-tight">
          Montar simulado personalizado
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <BookMarked className="h-4 w-4" aria-hidden="true" />
              Filtre por concurso, curso, matéria, assunto, banca e dificuldade — ou foque nas questões
              erradas/novas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MockExamBuilderForm contests={contests} courses={courseOptions} subjects={subjects} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
