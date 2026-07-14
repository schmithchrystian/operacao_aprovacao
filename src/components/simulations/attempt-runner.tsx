"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flag, FlagOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AttemptTimer } from "@/components/simulations/attempt-timer";
import { FavoriteToggleButton } from "@/components/simulations/favorite-toggle-button";
import { QuestionNavigator } from "@/components/simulations/question-navigator";
import { DIFFICULTY_BADGE_CLASS, DIFFICULTY_LABEL } from "@/components/simulations/labels";
import { cn } from "@/lib/utils";
import type { AttemptDTO } from "@/contracts/simulations";
import { submitAttemptAction } from "@/server/actions/simulations";

interface AttemptRunnerProps {
  attempt: AttemptDTO;
  initialFavoriteQuestionIds: string[];
}

/**
 * Resolução do simulado (Fase 10 — UI). ÚNICO Client Component da tela (`/simulados/[attemptId]`
 * é Server Component — só busca `AttemptDTO` e delega tudo daqui para baixo).
 *
 * Regra crítica (CLAUDE.md §18, nunca violar): `AttemptDTO`/`AttemptQuestionDTO` não têm
 * `isCorrect` em lugar nenhum — estruturalmente impossível exibir gabarito aqui. O timer é só
 * display (`AttemptTimer`); quem valida tempo e corrige é sempre o servidor
 * (`submitAttemptAction` -> `submitAndFinalize`). O envio contém só
 * `{attemptId, answers: [{questionId, selectedOptionId}]}` — nunca nota/pontos/tempo.
 */
export function AttemptRunner({ attempt, initialFavoriteQuestionIds }: AttemptRunnerProps) {
  const router = useRouter();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const autoSubmittedRef = useRef(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(attempt.questions.map((question) => [question.questionId, null])),
  );
  const [flagged, setFlagged] = useState<Set<string>>(() => new Set());
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(attempt.remainingSeconds);
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  const favoriteIds = useMemo(() => new Set(initialFavoriteQuestionIds), [initialFavoriteQuestionIds]);

  const totalQuestions = attempt.questions.length;
  const answeredCount = Object.values(answers).filter((value) => value !== null).length;
  const unansweredCount = totalQuestions - answeredCount;

  const currentQuestion = attempt.questions[currentIndex] ?? attempt.questions[0] ?? null;

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(Math.min(Math.max(index, 0), totalQuestions - 1));
    },
    [totalQuestions],
  );

  function handleSelectOption(questionId: string, optionId: string) {
    setAnswers((previous) => ({ ...previous, [questionId]: optionId }));
  }

  function handleToggleFlag(questionId: string) {
    setFlagged((previous) => {
      const next = new Set(previous);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  const handleSubmit = useCallback(() => {
    startSubmitTransition(async () => {
      const payload = {
        attemptId: attempt.id,
        answers: attempt.questions.map((question) => ({
          questionId: question.questionId,
          selectedOptionId: answers[question.questionId] ?? null,
        })),
      };

      const result = await submitAttemptAction(payload);

      if (!result.ok) {
        if (result.error.code === "CONFLICT") {
          // Encerrada pelo servidor (já finalizada OU expirada por tempo): a tentativa não está
          // mais IN_PROGRESS. Vai para `/resultado`, que roteia por status — renderiza o
          // resultado (FINISHED) ou o estado terminal (EXPIRED/CANCELLED), sem loop de redirect.
          toast.info(
            autoSubmittedRef.current
              ? "Tempo esgotado — esta tentativa foi encerrada."
              : "Esta tentativa já foi encerrada.",
          );
          router.push(`/simulados/${attempt.id}/resultado`);
          return;
        }
        toast.error(result.error.message);
        setShowFinishDialog(false);
        return;
      }

      toast.success("Simulado finalizado! Confira seu resultado.");
      router.push(`/simulados/${attempt.id}/resultado`);
    });
  }, [attempt.id, attempt.questions, answers, router]);

  // Timer client-side: só DISPLAY (decrementa localmente a partir do valor informado pelo
  // servidor). Nunca é a fonte usada para validar tempo — isso é sempre feito no servidor a
  // partir do relógio dele, mesmo quando este contador chega a 0 e dispara o auto-envio abaixo.
  useEffect(() => {
    if (attempt.timeLimitSeconds === null) return;
    if (remainingSeconds === null || remainingSeconds <= 0) return;

    const timeoutId = setTimeout(() => {
      setRemainingSeconds((current) => (current === null ? current : Math.max(0, current - 1)));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [remainingSeconds, attempt.timeLimitSeconds]);

  // Ao esgotar o tempo (exibido), envia automaticamente uma única vez. O servidor ainda valida
  // o tempo real de forma independente (`SIMULATIONS.timeOverageToleranceSeconds`) — este efeito
  // só evita deixar o aluno "preso" numa tela com o cronômetro zerado.
  useEffect(() => {
    if (attempt.timeLimitSeconds === null) return;
    if (remainingSeconds !== 0) return;
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    toast.message("Tempo esgotado — enviando suas respostas...");
    handleSubmit();
  }, [remainingSeconds, attempt.timeLimitSeconds, handleSubmit]);

  if (!currentQuestion) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          Este simulado não possui questões.
        </CardContent>
      </Card>
    );
  }

  const navigatorItems = attempt.questions.map((question) => ({
    questionId: question.questionId,
    answered: answers[question.questionId] !== null,
    flagged: flagged.has(question.questionId),
  }));

  const isCurrentFlagged = flagged.has(currentQuestion.questionId);

  return (
    <div className="space-y-4">
      <div className="border-border bg-card/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
        <div>
          <p className="text-foreground text-sm font-semibold">
            {attempt.mockExamTitle ?? "Simulado personalizado"}
          </p>
          <p className="text-muted-foreground text-xs">
            {answeredCount} respondida{answeredCount === 1 ? "" : "s"} · {unansweredCount} não respondida
            {unansweredCount === 1 ? "" : "s"}
            {flagged.size > 0 ? ` · ${flagged.size} marcada${flagged.size === 1 ? "" : "s"} para revisar` : ""}
          </p>
        </div>
        <AttemptTimer remainingSeconds={remainingSeconds} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <Card>
          <CardContent className="space-y-5">
            <fieldset className="space-y-4">
              <legend className="text-foreground w-full text-base leading-relaxed font-medium">
                <span className="text-muted-foreground block text-xs font-normal tracking-wide uppercase">
                  Questão {currentIndex + 1} de {totalQuestions}
                </span>
                {currentQuestion.statement}
              </legend>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{currentQuestion.subjectName}</Badge>
                {currentQuestion.topicName ? <Badge variant="outline">{currentQuestion.topicName}</Badge> : null}
                {currentQuestion.board ? <Badge variant="outline">{currentQuestion.board}</Badge> : null}
                <Badge variant="outline" className={DIFFICULTY_BADGE_CLASS[currentQuestion.difficulty]}>
                  {DIFFICULTY_LABEL[currentQuestion.difficulty]}
                </Badge>
                <FavoriteToggleButton
                  questionId={currentQuestion.questionId}
                  initialFavorite={favoriteIds.has(currentQuestion.questionId)}
                  className="ml-auto"
                />
              </div>

              <div className="space-y-2">
                {currentQuestion.options.map((option) => {
                  const isSelected = answers[currentQuestion.questionId] === option.id;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "border-input flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
                        isSelected && "border-primary bg-primary/5",
                      )}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.questionId}`}
                        value={option.id}
                        checked={isSelected}
                        onChange={() => handleSelectOption(currentQuestion.questionId, option.id)}
                        className="accent-primary mt-0.5"
                      />
                      <span>
                        <span className="font-semibold">{option.label})</span> {option.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
                Anterior
              </Button>
              <Button type="button" variant="outline" onClick={() => handleToggleFlag(currentQuestion.questionId)}>
                {isCurrentFlagged ? <FlagOff aria-hidden="true" /> : <Flag aria-hidden="true" />}
                {isCurrentFlagged ? "Remover marcação" : "Marcar para revisar"}
              </Button>
              <Button type="button" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === totalQuestions - 1}>
                Próxima
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Questões</p>
              <QuestionNavigator items={navigatorItems} currentIndex={currentIndex} onSelect={goTo} />
            </CardContent>
          </Card>
          <Button type="button" className="w-full" onClick={() => setShowFinishDialog(true)} disabled={isSubmitting}>
            Finalizar simulado
          </Button>
        </div>
      </div>

      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent aria-describedby="finish-attempt-description">
          <DialogHeader>
            <DialogTitle>Finalizar simulado?</DialogTitle>
            <DialogDescription id="finish-attempt-description">
              Você respondeu {answeredCount} de {totalQuestions} questões.
              {unansweredCount > 0
                ? unansweredCount === 1
                  ? " A 1 questão não respondida ficará em branco."
                  : ` As ${unansweredCount} questões não respondidas ficarão em branco.`
                : ""}{" "}
              Depois de finalizar não é possível alterar as respostas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowFinishDialog(false)} disabled={isSubmitting}>
              Voltar e revisar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Finalizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
