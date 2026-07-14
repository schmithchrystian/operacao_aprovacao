import type { Metadata } from "next";
import { ListX } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ErrorNotebookList } from "@/components/simulations/error-notebook-list";
import { getErrorNotebookAction } from "@/server/actions/simulations";

export const metadata: Metadata = { title: "Caderno de erros" };

const BREADCRUMBS = [
  { label: "Início", href: "/dashboard" },
  { label: "Simulados", href: "/simulados" },
  { label: "Caderno de erros" },
];

/**
 * Caderno de erros do aluno autenticado (Fase 10 — UI). Server Component: busca
 * `ErrorNotebookItemDTO[]` já pronto via `getErrorNotebookAction` (uma linha por questão já
 * errada ao menos uma vez, mais recorrente primeiro) e só renderiza — o filtro por matéria
 * (`ErrorNotebookList`) recorta em memória, sem nova requisição.
 */
export default async function CadernoDeErrosPage() {
  const result = await getErrorNotebookAction();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={BREADCRUMBS} />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Caderno de erros</h1>
        <p className="text-muted-foreground text-sm">
          Questões que você já errou em simulados, para reforçar antes da próxima tentativa.
        </p>
      </div>

      {!result.ok ? (
        <ErrorState title="Não foi possível carregar o caderno de erros" description={result.error.message} />
      ) : result.data.length === 0 ? (
        <EmptyState
          icon={ListX}
          title="Nenhuma questão errada até agora"
          description="Continue assim! Questões erradas em simulados aparecem automaticamente aqui."
        />
      ) : (
        <ErrorNotebookList items={result.data} />
      )}
    </div>
  );
}
