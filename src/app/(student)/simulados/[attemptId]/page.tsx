import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { AttemptRunner } from "@/components/simulations/attempt-runner";
import { AttemptTerminalState } from "@/components/simulations/attempt-terminal-state";
import { getAttemptAction, getAttemptStatusAction, listFavoritesAction } from "@/server/actions/simulations";

export const metadata: Metadata = { title: "Resolver simulado" };

interface AttemptPageProps {
  params: Promise<{ attemptId: string }>;
}

const BASE_BREADCRUMBS = [
  { label: "Início", href: "/dashboard" },
  { label: "Simulados", href: "/simulados" },
];

/**
 * Resolução de um simulado (Fase 10 — UI). Server Component: busca `AttemptDTO` (sem gabarito —
 * estruturalmente impossível, ver `@/contracts/simulations`) via `getAttemptAction` e delega
 * toda a interação (timer, seleção, navegação, finalização) para `AttemptRunner`, o único Client
 * Component desta tela.
 *
 * Roteamento por STATUS EXPLÍCITO (correção de segurança Fase 10 — MÉDIO): quando a tentativa
 * existe mas não está `IN_PROGRESS` (`CONFLICT`), consultamos o status real em vez de
 * redirecionar às cegas. Só `FINISHED` redireciona ao resultado; `EXPIRED`/`CANCELLED` renderizam
 * um estado terminal AQUI (sem redirecionar de volta ao resultado, que redirecionaria de volta
 * para cá — o loop de `ERR_TOO_MANY_REDIRECTS` que existia antes).
 */
export default async function AttemptPage({ params }: AttemptPageProps) {
  const { attemptId } = await params;

  const [attemptResult, favoritesResult] = await Promise.all([
    getAttemptAction({ attemptId }),
    listFavoritesAction(),
  ]);

  if (!attemptResult.ok) {
    if (attemptResult.error.code === "NOT_FOUND") {
      notFound();
    }
    if (attemptResult.error.code === "CONFLICT") {
      const statusResult = await getAttemptStatusAction({ attemptId });
      if (statusResult.ok) {
        if (statusResult.data.status === "FINISHED") {
          redirect(`/simulados/${attemptId}/resultado`);
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
        <Breadcrumbs items={[...BASE_BREADCRUMBS, { label: "Resolução" }]} />
        <ErrorState title="Não foi possível abrir esta tentativa" description={attemptResult.error.message} />
      </div>
    );
  }

  const favoriteQuestionIds = favoritesResult.ok ? favoritesResult.data.map((favorite) => favorite.questionId) : [];

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[...BASE_BREADCRUMBS, { label: attemptResult.data.mockExamTitle ?? "Resolução" }]}
      />
      <AttemptRunner attempt={attemptResult.data} initialFavoriteQuestionIds={favoriteQuestionIds} />
    </div>
  );
}
