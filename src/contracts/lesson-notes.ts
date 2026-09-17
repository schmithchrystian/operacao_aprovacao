import { z } from "zod";
import { idSchema } from "./common";
export const getLessonNoteInputSchema = z.object({ lessonId: idSchema });
export const saveLessonNoteInputSchema = getLessonNoteInputSchema.extend({
  content: z.string().max(50_000, "Use no máximo 50.000 caracteres."),
  expectedVersion: z.number().int().min(0),
});
export type SaveLessonNoteInput = z.infer<typeof saveLessonNoteInputSchema>;
export interface LessonNoteDTO {
  lessonId: string;
  content: string;
  version: number;
  updatedAt: string | null;
}
