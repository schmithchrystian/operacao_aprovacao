"use client";
import { useState, useTransition } from "react";
import { gradeProfessorQuiz } from "@/server/actions/professor-rs";

type Result = Extract<Awaited<ReturnType<typeof gradeProfessorQuiz>>, { ok: true }>["data"];
export function ProfessorQuiz({
  slug,
  questions,
}: {
  slug: string;
  questions: { id: string; statement: string; options: string[] }[];
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        startTransition(async () => {
          try {
            const response = await gradeProfessorQuiz({ slug, answers });
            if (response.ok) setResult(response.data);
            else setError(response.error.message);
          } catch {
            setError("Falha de conexão. Suas respostas continuam selecionadas; tente novamente.");
          }
        });
      }}
    >
      <p className="text-muted-foreground text-sm">
        Treino autoral de fundamentos. Não reproduz o formato nem a pontuação do edital. A correção
        não gera XP e permanece nesta sessão.
      </p>
      {questions.map((question, index) => (
        <fieldset
          key={question.id}
          className="space-y-2 rounded-xl border p-4"
          disabled={pending || !!result}
        >
          <legend className="px-2 font-medium">
            {index + 1}. {question.statement}
          </legend>
          {question.options.map((option, optionIndex) => (
            <label
              key={optionIndex}
              className="hover:bg-muted flex cursor-pointer items-start gap-3 rounded-lg p-2"
            >
              <input
                className="mt-1"
                type="radio"
                name={question.id}
                required
                checked={answers[question.id] === optionIndex}
                onChange={() =>
                  setAnswers((previous) => ({ ...previous, [question.id]: optionIndex }))
                }
              />
              <span>
                {String.fromCharCode(65 + optionIndex)}. {option}
              </span>
            </label>
          ))}
        </fieldset>
      ))}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {!result && (
        <button
          disabled={pending}
          className="bg-primary text-primary-foreground rounded-lg px-5 py-3 disabled:opacity-50"
        >
          {pending ? "Corrigindo…" : "Finalizar e ver comentários"}
        </button>
      )}
      {result && (
        <section aria-live="polite" className="space-y-4 rounded-xl border p-5">
          <h3 className="text-lg font-semibold">
            Resultado: {result.correct} de {result.total}
          </h3>
          <p>
            Caderno de erros: revise os itens indicados abaixo e tente novamente sem consultar o
            resumo.
          </p>
          {result.questions.map((q) => (
            <article key={q.id} className="border-t pt-3">
              <p className="font-medium">
                {q.correct ? "Acerto" : "Revisar"} · {q.subject} · {q.statement}
              </p>
              <p>Resposta: {q.answer}</p>
              <p className="text-muted-foreground text-sm">{q.explanation}</p>
            </article>
          ))}
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setResult(null);
            }}
            className="rounded-lg border px-4 py-2"
          >
            Refazer treino
          </button>
        </section>
      )}
    </form>
  );
}
