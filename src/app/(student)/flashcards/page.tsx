import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { FlashcardsWorkspace } from "@/components/flashcards/flashcards-workspace";
import { getRetentionStatsAction, listDecksAction } from "@/server/actions/flashcards";
import { listSubjectOptionsAction } from "@/server/actions/simulations";

export const metadata: Metadata = { title: "Flashcards" };

const BREADCRUMBS = [{ label: "Início", href: "/dashboard" }, { label: "Flashcards" }];

/**
 * Hub de Flashcards (Fase 14 — UI do agente `frontend`). Server Component: busca os baralhos
 * (`listDecksAction`), as estatísticas de retenção (`getRetentionStatsAction`) e as matérias (só
 * para os formulários de criação, `listSubjectOptionsAction`) em paralelo, e delega toda a
 * interatividade (dialogs, geração a partir de erros/anotações) para `FlashcardsWorkspace`. A
 * sessão de revisão em si vive em `/flashcards/revisar` — cada baralho linka para lá com
 * `?deckId=` (agregada, sem `deckId`, para o baralho virtual "Favoritos" — ver
 * `@/components/flashcards/deck-card.tsx`).
 *
 * `listDecksAction` é o dado PRINCIPAL desta página — uma falha vira `ErrorState` (mesmo
 * critério de `BrainstormPage`/`plano-de-estudos/page.tsx`). `getRetentionStatsAction`/
 * `listSubjectOptionsAction` são complementares: uma falha neles degrada a tela (sem bloco de
 * retenção / sem opções de matéria nos formulários) em vez de barrar a página inteira.
 */
export default async function FlashcardsPage() {
  const [decksResult, retentionResult, subjectsResult] = await Promise.all([
    listDecksAction(),
    getRetentionStatsAction(),
    listSubjectOptionsAction(),
  ]);

  if (!decksResult.ok) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={BREADCRUMBS} />
        <ErrorState title="Não foi possível carregar seus baralhos" description={decksResult.error.message} />
      </div>
    );
  }

  const subjects = subjectsResult.ok ? subjectsResult.data : [];

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={BREADCRUMBS} />
        <div className="flex items-center gap-2">
          <Layers className="text-primary h-6 w-6" aria-hidden="true" />
          <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Revise com repetição espaçada — classifique cada cartão como Errei, Difícil, Médio ou Fácil e o
          sistema calcula a próxima revisão para você.
        </p>
      </div>

      <FlashcardsWorkspace
        initialDecks={decksResult.data}
        initialRetention={retentionResult.ok ? retentionResult.data : null}
        subjects={subjects}
      />
    </div>
  );
}
