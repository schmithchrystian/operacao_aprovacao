"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgressBar } from "@/components/shared/progress-bar";
import { cn, formatDatePtBr } from "@/lib/utils";
import type { FlashcardRating, ReviewSessionDTO } from "@/contracts/flashcards";
import { reviewCardAction } from "@/server/actions/flashcards";
import { FlashcardFace } from "./flashcard-face";
import { pluralizeCartao, RATING_LABEL, RATING_ORDER } from "./labels";

interface ReviewSessionProps {
  initialSession: ReviewSessionDTO;
}

type RatingTally = Record<FlashcardRating, number>;

function emptyTally(): RatingTally {
  return { AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 };
}

/**
 * Sessão de revisão de flashcards (Fase 14 — UI, item 2 da tarefa). Único Client Component da
 * tela `/flashcards/revisar` — a página (Server Component) só busca `ReviewSessionDTO`
 * (`getReviewSessionAction`) e delega toda a interação para cá.
 *
 * Sem regra própria: quem decide o próximo `nextReviewAt`/`intervalDays`/`easeFactor` é sempre o
 * servidor (`reviewCardAction` -> `computeNextReview`, `@/server/services/flashcards/spaced-repetition.ts`)
 * — este componente só ENVIA a classificação escolhida e EXIBE o resultado devolvido.
 *
 * Tratamento de `CONFLICT` (cartão revisado em outra aba/janela entre o carregamento da sessão e
 * o clique — o gate anti-farm do servidor, `docs/FLASHCARDS.md` §4, rejeita a revisão porque
 * `nextReviewAt` ainda não chegou): mostra uma mensagem clara e PULA para o próximo cartão sem
 * contabilizar na sessão (nada foi de fato registrado). Qualquer outro erro mantém o cartão atual
 * (permite tentar de novo — pode ser transitório).
 */
export function ReviewSession({ initialSession }: ReviewSessionProps) {
  const router = useRouter();
  const [cards] = useState(initialSession.cards);
  const [totalDue] = useState(initialSession.totalDue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tally, setTally] = useState<RatingTally>(emptyTally);
  const [announcement, setAnnouncement] = useState("");

  const total = cards.length;
  const currentCard = cards[currentIndex] ?? null;
  const isFinished = total > 0 && currentIndex >= total;
  const completedCount = RATING_ORDER.reduce((sum, rating) => sum + tally[rating], 0);

  function advance() {
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setAnnouncement(nextIndex < total ? `Cartão ${nextIndex + 1} de ${total}.` : "Sessão de revisão concluída.");
  }

  async function handleRate(rating: FlashcardRating) {
    if (!currentCard || isSubmitting) return;
    setIsSubmitting(true);
    const result = await reviewCardAction({ flashcardId: currentCard.id, rating });
    setIsSubmitting(false);

    if (!result.ok) {
      if (result.error.code === "CONFLICT") {
        toast.error("Este cartão não está mais disponível para revisão agora — avançando para o próximo.");
        advance();
      } else {
        toast.error(result.error.message);
      }
      return;
    }

    const nextReviewLabel = result.data.nextReviewAt ? ` Próxima revisão: ${formatDatePtBr(result.data.nextReviewAt)}.` : "";
    toast.success(`Classificado como "${RATING_LABEL[rating]}".${nextReviewLabel}`);
    setTally((previous) => ({ ...previous, [rating]: previous[rating] + 1 }));
    advance();
  }

  if (total === 0) {
    // Link de navegação com aparência de botão — `buttonVariants` direto no `<Link>`, nunca
    // `<Button render={<Link/>}>` (mesmo padrão de `@/components/flashcards/deck-card.tsx` e
    // `@/components/dashboard/continue-mission-card.tsx`: preserva a semântica de "link", que é
    // o que este controle realmente é — navega para outra página).
    const backToFlashcardsLink = (
      <Link href="/flashcards" className={cn(buttonVariants())}>
        Voltar para Flashcards
      </Link>
    );

    return (
      <EmptyState
        icon={PartyPopper}
        title="Tudo em dia!"
        description="Nenhum cartão devido para revisão agora. Volte mais tarde ou crie novos cartões para estudar."
        action={backToFlashcardsLink}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Anuncia o avanço de cartão para leitores de tela — permanece montado durante toda a
          sessão (uma live region que aparece/desaparece com o conteúdo não é anunciada de forma
          confiável por todos os leitores de tela). */}
      <div aria-live="polite" data-testid="flashcards-announcement" className="sr-only">
        {announcement}
      </div>

      {!isFinished ? (
        <>
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              Cartão {currentIndex + 1} de {total}
              {totalDue > total ? ` (revisando ${total} de ${totalDue} devidos agora)` : ""}
            </p>
            <ProgressBar value={(currentIndex / total) * 100} showValue={false} />
          </div>

          <Card>
            <CardContent>
              {currentCard ? (
                <FlashcardFace
                  key={currentCard.id}
                  card={currentCard}
                  isSubmitting={isSubmitting}
                  onRate={handleRate}
                  autoFocus={currentIndex > 0}
                />
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <span className="bg-success/10 text-success mx-auto flex h-14 w-14 items-center justify-center rounded-full">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="text-foreground text-lg font-semibold">Sessão concluída!</p>
              <p className="text-muted-foreground text-sm">
                Você revisou {completedCount} {pluralizeCartao(completedCount)} agora.
              </p>
            </div>

            <div className="mx-auto grid max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
              {RATING_ORDER.map((rating) => (
                <div key={rating} className="border-border rounded-lg border py-2">
                  <p className="text-foreground text-lg font-semibold">{tally[rating]}</p>
                  <p className="text-muted-foreground text-xs">{RATING_LABEL[rating]}</p>
                </div>
              ))}
            </div>

            {totalDue > total ? (
              <p className="text-muted-foreground text-sm">
                Ainda há {totalDue - total} {pluralizeCartao(totalDue - total)} devido
                {totalDue - total === 1 ? "" : "s"}.{" "}
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="text-primary underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm outline-none"
                >
                  Carregar mais
                </button>
              </p>
            ) : null}

            {/* Link de navegação com aparência de botão — ver comentário no início desta função. */}
            <Link href="/flashcards" className={cn(buttonVariants())}>
              Voltar para Flashcards
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
