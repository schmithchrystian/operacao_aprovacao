import type { DeckDTO } from "@/contracts/flashcards";
import { DeckCard } from "./deck-card";
import { DECK_TYPE_DESCRIPTION, DECK_TYPE_LABEL, DECK_TYPE_ORDER } from "./labels";

interface DeckListProps {
  decks: DeckDTO[];
}

/**
 * Lista de baralhos agrupada por tipo (matéria / personalizados / favoritos / criados de erros /
 * criados de anotações — CLAUDE.md §19, item 1 da Fase 14). Server-safe (só `DeckCard`, sem
 * estado próprio). `decks` já chega ORDENADO pelo backend (`TYPE_ORDER`,
 * `@/server/services/flashcards/list-decks.ts`); `DECK_TYPE_ORDER` aqui só define em qual seção
 * cada grupo aparece — nunca reordena os itens dentro de um grupo.
 *
 * Um grupo vazio (ex.: aluno sem baralho pessoal ainda) simplesmente não renderiza sua seção —
 * "Favoritos" sempre existe (mesmo com 0 cartões, `listDecks` sempre sintetiza esse baralho
 * virtual), então ao menos essa seção aparece sempre.
 */
export function DeckList({ decks }: DeckListProps) {
  return (
    <div className="space-y-6">
      {DECK_TYPE_ORDER.map((type) => {
        const group = decks.filter((deck) => deck.type === type);
        if (group.length === 0) return null;

        return (
          <section key={type} aria-labelledby={`flashcards-deck-group-${type}`} className="space-y-2">
            <div>
              <h3
                id={`flashcards-deck-group-${type}`}
                className="text-muted-foreground text-sm font-semibold tracking-wide uppercase"
              >
                {DECK_TYPE_LABEL[type]}
              </h3>
              <p className="text-muted-foreground text-xs">{DECK_TYPE_DESCRIPTION[type]}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((deck) => (
                <DeckCard key={deck.id} deck={deck} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
