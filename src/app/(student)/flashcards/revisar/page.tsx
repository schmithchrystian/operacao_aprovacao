import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { ReviewSession } from "@/components/flashcards/review-session";
import { getReviewSessionAction } from "@/server/actions/flashcards";

export const metadata: Metadata = { title: "Revisar flashcards" };

const BREADCRUMBS = [
  { label: "Início", href: "/dashboard" },
  { label: "Flashcards", href: "/flashcards" },
  { label: "Revisar" },
];

interface RevisarFlashcardsPageProps {
  searchParams: Promise<{ deckId?: string }>;
}

/**
 * Sessão de revisão de flashcards (Fase 14 — UI, item 2 da tarefa). Server Component: busca os
 * cartões devidos (`getReviewSessionAction`, `deckId` opcional via query string — omitido agrega
 * todos os baralhos acessíveis) e delega toda a interação (flip, classificação, avanço) para
 * `ReviewSession`, o único Client Component desta tela.
 *
 * `deckId` inválido/baralho pessoal de outro aluno -> `NotFoundError` (anti-IDOR,
 * `loadAccessibleDeck`) — tratado aqui como um `ErrorState` (a mensagem do backend já é segura
 * para exibir), não `notFound()`, para não confundir com uma rota inexistente.
 *
 * `key` em `ReviewSession` = ids dos cartões da sessão atual: força REMONTAR o componente (todo o
 * estado local — índice, tabulação de classificações — do zero) quando "Carregar mais"
 * (`router.refresh()`, dentro de `ReviewSession`) traz um lote diferente de cartões devidos —
 * sem isso, o `initialSession` novo chegaria como prop, mas o `useState` que o inicializou não
 * seria atualizado (React só usa o valor inicial de `useState` na primeira renderização).
 */
export default async function RevisarFlashcardsPage({ searchParams }: RevisarFlashcardsPageProps) {
  const { deckId } = await searchParams;
  const result = await getReviewSessionAction({ deckId: deckId || undefined });

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={BREADCRUMBS} />
        <ErrorState title="Não foi possível carregar a sessão de revisão" description={result.error.message} />
      </div>
    );
  }

  const sessionKey = result.data.cards.map((card) => card.id).join(",") || "empty";

  return (
    <div className="space-y-4">
      <Breadcrumbs items={BREADCRUMBS} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revisão de flashcards</h1>
        <p className="text-muted-foreground text-sm">
          Leia a pergunta, tente lembrar a resposta e só depois mostre a resposta certa — classifique com
          sinceridade, isso define quando este cartão volta a aparecer.
        </p>
      </div>
      <ReviewSession key={sessionKey} initialSession={result.data} />
    </div>
  );
}
