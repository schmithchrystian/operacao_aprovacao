import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { FavoritesList } from "@/components/simulations/favorites-list";
import { listFavoritesAction } from "@/server/actions/simulations";

export const metadata: Metadata = { title: "Questões favoritas" };

const BREADCRUMBS = [
  { label: "Início", href: "/dashboard" },
  { label: "Simulados", href: "/simulados" },
  { label: "Favoritos" },
];

/**
 * Questões favoritadas do aluno autenticado (Fase 10 — UI). Server Component: busca
 * `FavoriteQuestionDTO[]` via `listFavoritesAction` e só renderiza.
 */
export default async function SimuladosFavoritosPage() {
  const result = await listFavoritesAction();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={BREADCRUMBS} />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Questões favoritas</h1>
        <p className="text-muted-foreground text-sm">
          Questões marcadas para revisar depois, durante a resolução de um simulado ou no caderno de erros.
        </p>
      </div>

      {!result.ok ? (
        <ErrorState title="Não foi possível carregar seus favoritos" description={result.error.message} />
      ) : (
        <FavoritesList items={result.data} />
      )}
    </div>
  );
}
