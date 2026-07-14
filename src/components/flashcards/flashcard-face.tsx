"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DIFFICULTY_BADGE_CLASS, DIFFICULTY_LABEL } from "@/components/simulations/labels";
import { cn } from "@/lib/utils";
import type { FlashcardDTO, FlashcardRating } from "@/contracts/flashcards";
import { FlashcardFavoriteToggleButton } from "./favorite-toggle-button";
import { RATING_BUTTON_CLASS, RATING_ICON, RATING_LABEL, RATING_ORDER } from "./labels";

interface FlashcardFaceProps {
  card: FlashcardDTO;
  isSubmitting: boolean;
  onRate: (rating: FlashcardRating) => void;
  /** `false` no PRIMEIRO cartão da sessão (deixa o foco onde o navegador/leitor de tela pousou ao
   *  carregar a página); `true` nos cartões seguintes (move o foco para a nova pergunta, reforço
   *  além do `aria-live` — ver `ReviewSession`). */
  autoFocus: boolean;
}

/**
 * Um cartão da sessão de revisão — pergunta sempre visível; "Mostrar resposta" revela a resposta
 * + os 4 botões de classificação (item 2 da tarefa da Fase 14). Componente KEYED por `card.id`
 * no pai (`ReviewSession`, mesmo padrão de `key={targetKey(target)}` em
 * `@/components/brainstorm/card-form-dialog.tsx`): a cada cartão novo, este componente remonta do
 * zero — `revealed` volta a `false` sem precisar de `useEffect` de reset.
 *
 * "Flip discreto" (instrução da fase — animação sóbria, sem exagero): a resposta aparece com uma
 * transição de ENTRADA (fade + leve deslocamento, utilitários `tw-animate-css` já usados no
 * projeto, ex. `@/components/ui/dropdown-menu.tsx`), não uma rotação 3D de card. Decisão
 * deliberada: um flip 3D clássico (duas faces sobrepostas, uma girada 180°) deixa as DUAS faces
 * presentes na árvore de acessibilidade ao mesmo tempo (visualmente ocultas com
 * `backface-visibility`, mas não necessariamente para leitores de tela) — a transição de entrada
 * evita esse problema por construção (só a face atual existe no DOM) e respeita
 * `prefers-reduced-motion` (`motion-reduce:animate-none`).
 */
export function FlashcardFace({ card, isSubmitting, onRate, autoFocus }: FlashcardFaceProps) {
  const [revealed, setRevealed] = useState(false);
  const questionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus) {
      questionRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {card.subjectName ? <Badge variant="outline">{card.subjectName}</Badge> : null}
          {card.topicName ? <Badge variant="outline">{card.topicName}</Badge> : null}
          <Badge variant="outline" className={DIFFICULTY_BADGE_CLASS[card.difficulty]}>
            {DIFFICULTY_LABEL[card.difficulty]}
          </Badge>
          {card.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        <FlashcardFavoriteToggleButton flashcardId={card.id} initialFavorite={card.isFavorite} />
      </div>

      <div
        ref={questionRef}
        tabIndex={-1}
        className="space-y-1 rounded-md outline-none focus:ring-2 focus:ring-ring/50"
      >
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Pergunta</p>
        <p className="text-foreground text-lg leading-relaxed font-medium">{card.question}</p>
        <p className="text-muted-foreground text-xs">Baralho: {card.deckTitle}</p>
      </div>

      {!revealed ? (
        <Button type="button" className="w-full sm:w-auto" onClick={() => setRevealed(true)}>
          <Eye aria-hidden="true" />
          Mostrar resposta
        </Button>
      ) : (
        <div className="animate-in fade-in-0 slide-in-from-top-1 motion-reduce:animate-none space-y-4 duration-300">
          <div className="border-border space-y-1 border-t pt-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Resposta</p>
            <p className="text-foreground leading-relaxed">{card.answer}</p>
          </div>

          <fieldset disabled={isSubmitting} className="space-y-2">
            <legend className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Como foi lembrar disso?
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RATING_ORDER.map((rating) => {
                const Icon = RATING_ICON[rating];
                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => onRate(rating)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                      RATING_BUTTON_CLASS[rating],
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {RATING_LABEL[rating]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}
