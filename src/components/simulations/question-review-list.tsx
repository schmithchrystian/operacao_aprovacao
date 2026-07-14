import { CheckCircle2, ChevronDown, CircleDashed, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_BADGE_CLASS, DIFFICULTY_LABEL } from "@/components/simulations/labels";
import { cn } from "@/lib/utils";
import type { QuestionResultDTO } from "@/contracts/simulations";

interface QuestionReviewListProps {
  questions: QuestionResultDTO[];
}

function StatusIcon({ isCorrect }: { isCorrect: boolean | null }) {
  if (isCorrect === true) {
    return (
      <span className="text-success mt-0.5 flex shrink-0 items-center">
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Correta</span>
      </span>
    );
  }
  if (isCorrect === false) {
    return (
      <span className="text-destructive mt-0.5 flex shrink-0 items-center">
        <XCircle className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Errada</span>
      </span>
    );
  }
  return (
    <span className="text-muted-foreground mt-0.5 flex shrink-0 items-center">
      <CircleDashed className="h-5 w-5" aria-hidden="true" />
      <span className="sr-only">Não respondida</span>
    </span>
  );
}

/**
 * Gabarito + explicação por questão, PÓS-correção (`QuestionResultDTO` — a tentativa já está
 * `FINISHED`, então `isCorrect`/`explanation` já estão liberados, ao contrário da resolução em
 * `AttemptRunner`). Server Component: usa `<details>`/`<summary>` nativos para o
 * recolher/expandir — nenhum JavaScript de cliente é necessário para essa interação. Questões
 * erradas/não respondidas começam expandidas; as certas começam recolhidas.
 */
export function QuestionReviewList({ questions }: QuestionReviewListProps) {
  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <details
          key={question.questionId}
          open={question.isCorrect !== true}
          className="group border-border rounded-lg border p-4"
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 focus-visible:outline-none">
            <div className="flex items-start gap-3">
              <StatusIcon isCorrect={question.isCorrect} />
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Questão {index + 1}
                </p>
                <p className="text-foreground line-clamp-2 text-sm font-medium group-open:line-clamp-none">
                  {question.statement}
                </p>
              </div>
            </div>
            <ChevronDown
              className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>

          <div className="mt-4 space-y-3 pl-8">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">{question.subjectName}</Badge>
              {question.topicName ? <Badge variant="outline">{question.topicName}</Badge> : null}
              {question.board ? <Badge variant="outline">{question.board}</Badge> : null}
              <Badge variant="outline" className={DIFFICULTY_BADGE_CLASS[question.difficulty]}>
                {DIFFICULTY_LABEL[question.difficulty]}
              </Badge>
            </div>

            <ul className="space-y-1.5">
              {question.options.map((option) => {
                const isSelected = option.id === question.selectedOptionId;
                return (
                  <li
                    key={option.id}
                    className={cn(
                      "flex items-start gap-2 rounded-md border p-2 text-sm",
                      option.isCorrect
                        ? "border-success/40 bg-success/10"
                        : isSelected
                          ? "border-destructive/40 bg-destructive/10"
                          : "border-border",
                    )}
                  >
                    <span className="font-semibold">{option.label})</span>
                    <span className="flex-1">{option.text}</span>
                    {option.isCorrect ? (
                      <Badge variant="outline" className="border-success/40 text-success shrink-0">
                        Gabarito
                      </Badge>
                    ) : null}
                    {isSelected && !option.isCorrect ? (
                      <Badge variant="outline" className="border-destructive/40 text-destructive shrink-0">
                        Sua resposta
                      </Badge>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {question.selectedOptionId === null ? (
              <p className="text-muted-foreground text-xs italic">Você não respondeu esta questão.</p>
            ) : null}

            {question.explanation ? (
              <div className="bg-muted/50 rounded-md p-3 text-sm">
                <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                  Explicação
                </p>
                <p>{question.explanation}</p>
              </div>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}
