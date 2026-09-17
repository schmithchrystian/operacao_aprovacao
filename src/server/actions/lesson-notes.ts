"use server";
import { fail, ok, type ActionResult } from "@/contracts/common";
import {
  getLessonNoteInputSchema,
  saveLessonNoteInputSchema,
  type LessonNoteDTO,
} from "@/contracts/lesson-notes";
import { isDomainError } from "@/server/errors";
import { parseInput } from "@/server/validation";
import { getLessonNote, saveLessonNote } from "@/server/services/courses/lesson-notes";
export async function getLessonNoteAction(raw: unknown): Promise<ActionResult<LessonNoteDTO>> {
  try {
    return ok(await getLessonNote(parseInput(getLessonNoteInputSchema, raw).lessonId));
  } catch (error) {
    return isDomainError(error)
      ? fail(error.code, error.message)
      : fail("INTERNAL_ERROR", "Não foi possível carregar as anotações.");
  }
}
export async function saveLessonNoteAction(raw: unknown): Promise<ActionResult<LessonNoteDTO>> {
  try {
    return ok(await saveLessonNote(parseInput(saveLessonNoteInputSchema, raw)));
  } catch (error) {
    return isDomainError(error)
      ? fail(error.code, error.message)
      : fail("INTERNAL_ERROR", "Não foi possível salvar as anotações.");
  }
}
