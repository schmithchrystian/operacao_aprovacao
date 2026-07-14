import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DeckDTO } from "@/contracts/flashcards";
import { cn } from "@/lib/utils";
import { DECK_TYPE_ICON, pluralizeCartao } from "./labels";

interface DeckCardProps {
  deck: DeckDTO;
}

/**
 * Cartão de um baralho no hub de Flashcards (Fase 14 — UI). Server-safe (só `Link`/exibição —
 * nenhum estado próprio), renderizado dentro de `DeckList`.
 *
 * O baralho virtual "Favoritos" (`@/server/services/flashcards/list-decks.ts`, sintetizado —
 * nunca um `deckId` real) não pode ser passado como `deckId` para `getReviewSessionAction`
 * (`loadAccessibleDeck` devolveria 404). Por isso, SÓ para este tipo, o link "Revisar" aponta
 * para a sessão AGREGADA (`/flashcards/revisar`, sem `deckId`) em vez de uma sessão restrita a
 * este baralho — com uma legenda explícita para não sugerir que a revisão fica restrita aos
 * favoritos (docs/FLASHCARDS.md §5).
 */
export function DeckCard({ deck }: DeckCardProps) {
  const Icon = DECK_TYPE_ICON[deck.type];
  const isFavorites = deck.type === "FAVORITES";
  const reviewHref = isFavorites ? "/flashcards/revisar" : `/flashcards/revisar?deckId=${deck.id}`;
  const hasDue = deck.dueCount > 0;

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-foreground truncate font-semibold">{deck.title}</p>
            {deck.subjectName ? <p className="text-muted-foreground truncate text-xs">{deck.subjectName}</p> : null}
          </div>
          <span className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">
            {deck.cardCount} {pluralizeCartao(deck.cardCount)}
          </Badge>
          {hasDue ? (
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
              {deck.dueCount} p/ revisar
            </Badge>
          ) : (
            <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
              Em dia
            </Badge>
          )}
        </div>

        <div className="mt-auto space-y-1 pt-1">
          {deck.cardCount === 0 ? (
            <p className="text-muted-foreground text-xs">Nenhum cartão ainda.</p>
          ) : hasDue ? (
            // Link de navegação com APARÊNCIA de botão: `buttonVariants` direto no `<Link>` em
            // vez de `<Button render={<Link/>}>` — mantém a semântica correta de "link" (algo
            // que NAVEGA), sem o aviso do Base UI nem um `role="button"` forçado num link (mesmo
            // padrão de `@/components/dashboard/continue-mission-card.tsx`).
            <Link href={reviewHref} className={cn(buttonVariants({ size: "sm" }), "w-full")}>
              Revisar
            </Link>
          ) : (
            <p className="text-muted-foreground text-xs">Nenhum cartão devido agora.</p>
          )}
          {isFavorites && deck.cardCount > 0 ? (
            <p className="text-muted-foreground text-[0.65rem] leading-snug">
              A revisão dos favoritos é feita junto com todos os baralhos (não é possível revisar só os
              favoritos ainda).
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
