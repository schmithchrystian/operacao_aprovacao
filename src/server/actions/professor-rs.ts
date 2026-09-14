"use server";
import { z } from "zod";
import { requireUser } from "@/server/authorization";
import { getProfessorCourse } from "@/server/services/professor-rs/catalog";
import { buildProfessorPlan, planOptionsSchema } from "@/content/professor-rs/planner";
import { ok, fail } from "@/contracts/common";
import { isDomainError } from "@/server/errors";

const answersSchema = z.object({
  slug: z.string().max(100),
  answers: z.record(z.string().max(100), z.number().int().min(0).max(4)),
});
export async function gradeProfessorQuiz(input: unknown) {
  try {
    await requireUser();
    const { slug, answers } = answersSchema.parse(input);
    const pack = getProfessorCourse(slug);
    if (!pack) return fail("NOT_FOUND", "Curso não encontrado.");
    const questions = pack.lessons.flatMap((lesson) =>
      lesson.practice.map((q) => ({ ...q, subject: lesson.subject })),
    );
    const ids = Object.keys(answers);
    if (
      !ids.length ||
      ids.length > questions.length ||
      ids.some((id) => !questions.some((q) => q.id === id && answers[id]! < q.options.length))
    )
      return fail("VALIDATION_ERROR", "Respostas inválidas.");
    const corrected = questions
      .filter((q) => ids.includes(q.id))
      .map((q) => ({
        id: q.id,
        statement: q.statement,
        subject: q.subject,
        correct: q.correctIndex === answers[q.id],
        answer: q.options[q.correctIndex]!,
        explanation: q.explanation,
      }));
    return ok({
      correct: corrected.filter((q) => q.correct).length,
      total: corrected.length,
      questions: corrected,
    });
  } catch (error) {
    return fail(
      isDomainError(error) ? error.code : "VALIDATION_ERROR",
      isDomainError(error)
        ? error.message
        : "Não foi possível corrigir. Confira as respostas e tente novamente.",
    );
  }
}
export async function generateProfessorPlan(input: unknown) {
  try {
    await requireUser();
    const parsed = z.object({ slug: z.string().max(100), options: planOptionsSchema }).parse(input);
    const pack = getProfessorCourse(parsed.slug);
    if (!pack) return fail("NOT_FOUND", "Curso não encontrado.");
    return ok(buildProfessorPlan(pack, parsed.options));
  } catch (error) {
    return fail(
      isDomainError(error) ? error.code : "VALIDATION_ERROR",
      isDomainError(error) ? error.message : "Confira data, dias por semana e tempo diário.",
    );
  }
}
