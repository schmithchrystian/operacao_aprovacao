import { env } from "@/config/env";
import type { LessonNoteDTO, SaveLessonNoteInput } from "@/contracts/lesson-notes";
import { requireUser } from "@/server/authorization";
import { ConflictError, NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { mockStore } from "@/server/repositories/mock/mock-store";
import { inRepositoryTransaction } from "@/server/repositories/transaction";
import { assertActiveEnrollment } from "@/server/services/study-tracking/enrollment";
const notes = mockStore<Map<string, LessonNoteDTO>>("lesson-notes", () => new Map());

async function authorize(lessonId: string): Promise<string> {
  const session = await requireUser();
  const repos = getRepositories();
  const lesson = await repos.lessons.findById(lessonId);
  const courseModule = lesson ? await repos.modules.findById(lesson.moduleId) : null;
  if (!lesson || !courseModule) throw new NotFoundError("Aula não encontrada.");
  await assertActiveEnrollment(session.userId, courseModule.courseId, lessonId);
  return session.userId;
}
export async function getLessonNote(lessonId: string): Promise<LessonNoteDTO> {
  const userId = await authorize(lessonId);
  if (env.DATA_SOURCE === "mock")
    return structuredClone(
      notes.get(`${userId}:${lessonId}`) ?? { lessonId, content: "", version: 0, updatedAt: null },
    );
  const { prisma } = await import("@/server/db/prisma");
  const row = await prisma.lessonNote.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
  return row
    ? {
        lessonId,
        content: row.content,
        version: row.version,
        updatedAt: row.updatedAt.toISOString(),
      }
    : { lessonId, content: "", version: 0, updatedAt: null };
}
export async function saveLessonNote(input: SaveLessonNoteInput): Promise<LessonNoteDTO> {
  return inRepositoryTransaction(async () => {
    const userId = await authorize(input.lessonId);
    if (env.DATA_SOURCE === "mock") {
      const key = `${userId}:${input.lessonId}`;
      const current = notes.get(key);
      if ((current?.version ?? 0) !== input.expectedVersion)
        throw new ConflictError("As anotações foram alteradas em outra janela.");
      const next = {
        lessonId: input.lessonId,
        content: input.content,
        version: input.expectedVersion + 1,
        updatedAt: new Date().toISOString(),
      };
      notes.set(key, next);
      return structuredClone(next);
    }
    const { prisma } = await import("@/server/db/prisma");
    if (input.expectedVersion === 0) {
      // Atomic insert-if-absent also handles simultaneous first saves without aborting the transaction.
      const created = await prisma.lessonNote.createMany({
        data: [{ userId, lessonId: input.lessonId, content: input.content }],
        skipDuplicates: true,
      });
      if (!created.count) throw new ConflictError("As anotações foram alteradas em outra janela.");
    } else {
      const updated = await prisma.lessonNote.updateMany({
        where: { userId, lessonId: input.lessonId, version: input.expectedVersion },
        data: { content: input.content, version: { increment: 1 } },
      });
      if (!updated.count) throw new ConflictError("As anotações foram alteradas em outra janela.");
    }
    const row = await prisma.lessonNote.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: input.lessonId } },
    });
    return {
      lessonId: row.lessonId,
      content: row.content,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}
