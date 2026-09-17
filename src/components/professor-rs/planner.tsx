"use client";
import { useState, useTransition } from "react";
import { generateProfessorPlan } from "@/server/actions/professor-rs";
import type { ProfessorPlanDay } from "@/content/professor-rs/planner";

export function ProfessorPlanner({ slug }: { slug: string }) {
  const [plan, setPlan] = useState<ProfessorPlanDay[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function download() {
    const content = [
      "Data,Tipo,Minutos,Atividade",
      ...plan.flatMap((day) =>
        day.tasks.map((task) =>
          [day.date, task.type, task.minutes, `"${task.title.replaceAll('"', '""')}"`].join(","),
        ),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug}-cronograma.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="space-y-5">
      <p className="text-muted-foreground">
        O plano inclui as aulas disponíveis, prática e revisões. Os primeiros dias de cada ciclo de
        sete dias são dias de estudo. Revisões que caem no descanso passam ao próximo dia
        disponível. A duração depende da carga escolhida, não de uma data de prova presumida.
      </p>
      <form
        className="flex flex-wrap items-end gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setError("");
          startTransition(async () => {
            try {
              const result = await generateProfessorPlan({
                slug,
                options: {
                  startDate: data.get("start"),
                  daysPerWeek: Number(data.get("days")),
                  minutesPerDay: Number(data.get("minutes")),
                },
              });
              if (result.ok) setPlan(result.data);
              else setError(result.error.message);
            } catch {
              setError("Falha de conexão ao gerar cronograma. Tente novamente.");
            }
          });
        }}
      >
        <label className="grid gap-1 text-sm">
          Data de início
          <input
            required
            name="start"
            type="date"
            className="bg-background rounded-lg border p-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Dias por semana
          <input
            required
            name="days"
            type="number"
            min="1"
            max="6"
            defaultValue="5"
            className="bg-background w-32 rounded-lg border p-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Minutos por dia
          <input
            required
            name="minutes"
            type="number"
            min="30"
            max="240"
            defaultValue="90"
            className="bg-background w-32 rounded-lg border p-2"
          />
        </label>
        <button
          disabled={pending}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 disabled:opacity-50"
        >
          {pending ? "Organizando…" : "Montar cronograma"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {plan.length > 0 && (
        <div className="space-y-4" aria-live="polite">
          <div className="flex flex-wrap items-center gap-4">
            <p>
              {plan.length} dias com atividades · até{" "}
              {plan.at(-1)?.date.split("-").reverse().join("/")}
            </p>
            <button onClick={download} className="rounded-lg border px-4 py-2">
              Baixar cronograma CSV
            </button>
          </div>
          <p className="text-muted-foreground text-sm">
            Baixe para guardar. Este cronograma não é salvo automaticamente no plano de estudos da
            sua conta.
          </p>
          <div className="max-h-[32rem] overflow-y-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Cronograma com carga diária e revisões espaçadas
              </caption>
              <thead>
                <tr>
                  <th className="p-3">Dia</th>
                  <th className="p-3">Atividades</th>
                  <th className="p-3">Tempo</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((day) => (
                  <tr key={day.date} className="border-t">
                    <td className="p-3 align-top whitespace-nowrap">
                      {day.date.split("-").reverse().join("/")}
                    </td>
                    <td className="p-3">
                      {day.tasks.map((task, i) => (
                        <p key={i}>
                          {task.type}: {task.title} ({task.minutes} min)
                        </p>
                      ))}
                    </td>
                    <td className="p-3 align-top">
                      {day.tasks.reduce((sum, task) => sum + task.minutes, 0)} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
