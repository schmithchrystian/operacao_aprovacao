import type { Metadata } from "next";
import { History } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { HistoryList } from "@/components/simulations/history-list";
import { getHistoryAction } from "@/server/actions/simulations";

export const metadata: Metadata = { title: "Histórico de simulados" };

const BREADCRUMBS = [
  { label: "Início", href: "/dashboard" },
  { label: "Simulados", href: "/simulados" },
  { label: "Histórico" },
];

/**
 * Histórico de tentativas do aluno autenticado (Fase 10 — UI). Server Component: busca
 * `HistoryItemDTO[]` já pronto (ordenado, mais recente primeiro) via `getHistoryAction` e só
 * renderiza — nenhuma nota/aproveitamento é calculada aqui.
 */
export default async function SimuladosHistoricoPage() {
  const result = await getHistoryAction();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={BREADCRUMBS} />
      <h1 className="text-2xl font-semibold tracking-tight">Histórico de simulados</h1>

      {!result.ok ? (
        <ErrorState title="Não foi possível carregar o histórico" description={result.error.message} />
      ) : result.data.length === 0 ? (
        <EmptyState
          icon={History}
          title="Você ainda não fez nenhum simulado"
          description="Monte ou inicie um simulado para começar a construir seu histórico."
        />
      ) : (
        <HistoryList items={result.data} />
      )}
    </div>
  );
}
