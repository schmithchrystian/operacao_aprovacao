import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Trophy } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { RankingCurrentUserBar } from "@/components/ranking/ranking-current-user-bar";
import { RankingFilters } from "@/components/ranking/ranking-filters";
import { RankingPagination } from "@/components/ranking/ranking-pagination";
import { RankingPodium } from "@/components/ranking/ranking-podium";
import { RankingResults } from "@/components/ranking/ranking-results";
import {
  parseRankingQuery,
  periodParamToType,
  scopeParamToType,
  type RankingScopeOption,
  type RankingSearchParams,
} from "@/components/ranking/ranking-query";
import { listCoursesAction } from "@/server/actions/courses";
import { getRankingAction } from "@/server/actions/ranking";

export const metadata: Metadata = { title: "Ranking" };

interface RankingPageProps {
  searchParams: Promise<RankingSearchParams>;
}

const BREADCRUMBS = [{ label: "Início", href: "/dashboard" }, { label: "Ranking" }];

/**
 * Página de Ranking (Fase 9 — UI do agente `frontend`). Server Component: lê os filtros da
 * querystring (`@/components/ranking/ranking-query`), busca `RankingReadResultDTO` já pronto
 * via `getRankingAction` (métricas, ordenação, mascaramento de privacidade e a posição real do
 * usuário autenticado ficam inteiramente no agente `gamification`, `@/server/services/
 * gamification/ranking/read.ts`) e só renderiza. Nenhum cálculo de pontos/nível/posição/
 * evolução acontece aqui. Os filtros (`RankingFilters`, client) só reescrevem a URL — quem
 * busca dados é sempre esta página, ao reler `searchParams`.
 */
export default async function RankingPage({ searchParams }: RankingPageProps) {
  const rawParams = await searchParams;
  const query = parseRankingQuery(rawParams);

  const coursesResult = await listCoursesAction();
  const courses = coursesResult.ok ? coursesResult.data : [];

  const contestOptions: RankingScopeOption[] = Array.from(
    new Map(courses.map((course) => [course.contestId, course.contestName])).entries(),
  ).map(([value, label]) => ({ value, label }));

  const courseOptions: RankingScopeOption[] = courses.map((course) => ({
    value: course.id,
    label: course.title,
  }));

  const needsScopeKey = query.scope !== "global";
  const hasScopeKey = query.scopeKey.length > 0;

  const result =
    needsScopeKey && !hasScopeKey
      ? null
      : await getRankingAction({
          periodType: periodParamToType(query.period),
          scopeType: scopeParamToType(query.scope),
          scopeKey: needsScopeKey ? query.scopeKey : "global",
          page: query.page,
        });

  const currentUserBar =
    result && result.ok && result.data.currentUser ? (
      <RankingCurrentUserBar
        entry={result.data.currentUser}
        query={query}
        currentPage={result.data.page}
        pageSize={result.data.pageSize}
      />
    ) : null;

  let content: ReactNode;

  if (result === null) {
    content = (
      <EmptyState
        icon={Trophy}
        title="Selecione um valor para este escopo"
        description="Escolha um concurso, curso, cidade ou estado nos filtros acima para ver o ranking correspondente."
      />
    );
  } else if (!result.ok) {
    content = <ErrorState title="Não foi possível carregar o ranking" description={result.error.message} />;
  } else if (result.data.calculationVersion === null) {
    content = (
      <EmptyState
        icon={Trophy}
        title="Ranking ainda não calculado"
        description="Este período/escopo ainda não teve o ranking processado. Volte em breve."
      />
    );
  } else if (result.data.items.length === 0) {
    content = (
      <EmptyState
        icon={Trophy}
        title="Nenhum resultado nesta página"
        description="Ajuste os filtros ou volte para a primeira página."
      />
    );
  } else {
    content = (
      <>
        <RankingPodium entries={result.data.top3} />
        <RankingResults items={result.data.items} />
        <RankingPagination
          query={query}
          page={result.data.page}
          pageSize={result.data.pageSize}
          total={result.data.total}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={BREADCRUMBS} />
      <h1 className="text-2xl font-semibold tracking-tight">Ranking</h1>

      <RankingFilters query={query} contestOptions={contestOptions} courseOptions={courseOptions} />

      <div className="space-y-6">{content}</div>

      {currentUserBar}
    </div>
  );
}
