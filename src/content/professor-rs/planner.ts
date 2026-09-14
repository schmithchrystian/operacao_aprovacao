import { z } from "zod";
import type { CoursePack } from "./schema";

export const planOptionsSchema = z.object({
  startDate: z.iso.date(),
  daysPerWeek: z.number().int().min(1).max(6),
  minutesPerDay: z.number().int().min(30).max(240),
});
export type PlanOptions = z.infer<typeof planOptionsSchema>;
export interface ProfessorPlanDay {
  date: string;
  tasks: { title: string; minutes: number; type: "aula" | "revisao" | "simulado" }[];
}

/** Horçamento real por dia; revisões D+1/7/30 passam ao próximo dia disponível sem sobrecarga. */
export function buildProfessorPlan(pack: CoursePack, raw: PlanOptions): ProfessorPlanDay[] {
  const options = planOptionsSchema.parse(raw);
  const start = new Date(`${options.startDate}T12:00:00Z`);
  const days: ProfessorPlanDay[] = [];
  const queue: {
    due: number;
    title: string;
    minutes: number;
    type: "aula" | "revisao" | "simulado";
  }[] = [];
  let lessonIndex = 0;
  let active: { title: string; remaining: number } | undefined;
  let studiedDays = 0;
  for (let offset = 0; offset < 3650; offset++) {
    if (!active && lessonIndex >= pack.lessons.length && queue.length === 0) break;
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    // Semana relativa à data escolhida: primeiros N dias de cada ciclo de 7.
    if (offset % 7 >= options.daysPerWeek) continue;
    const tasks: ProfessorPlanDay["tasks"] = [];
    let budget = options.minutesPerDay;
    queue.sort((a, b) => a.due - b.due);
    for (const task of [...queue]) {
      if (task.due > offset || budget === 0) continue;
      const minutes = Math.min(budget, task.minutes);
      tasks.push({ title: task.title, minutes, type: task.type });
      budget -= minutes;
      task.minutes -= minutes;
      if (task.minutes === 0) queue.splice(queue.indexOf(task), 1);
    }
    while (budget > 0 && (active || lessonIndex < pack.lessons.length)) {
      if (!active) {
        const lesson = pack.lessons[lessonIndex++]!;
        active = { title: lesson.title, remaining: lesson.minutes };
      }
      const minutes = Math.min(budget, active.remaining);
      tasks.push({ title: active.title, minutes, type: "aula" });
      budget -= minutes;
      active.remaining -= minutes;
      if (active.remaining === 0) {
        for (const interval of [1, 7, 30])
          queue.push({
            due: offset + interval,
            title: `D+${interval}: ${active.title}`,
            minutes: 10,
            type: "revisao",
          });
        active = undefined;
      }
    }
    if (tasks.length) {
      days.push({ date: date.toISOString().slice(0, 10), tasks });
      if (tasks.some((task) => task.type === "aula") && ++studiedDays % 6 === 0) {
        queue.push({
          due: offset + 1,
          title: "Simulado autoral + caderno de erros",
          minutes: 30,
          type: "simulado",
        });
      }
    }
  }
  if (active || lessonIndex < pack.lessons.length || queue.length)
    throw new Error("Plano excede o horizonte de dez anos; aumente a disponibilidade.");
  return days;
}
