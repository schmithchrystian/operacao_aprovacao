import { beforeEach, expect, it, vi } from "vitest";
import { ensureAuthenticatedUser } from "../helpers/authenticated-user";
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));
const { getRepositories } = await import("@/server/repositories");
const { getLessonNote, saveLessonNote } = await import("@/server/services/courses/lesson-notes");
const { saveLessonNoteAction } = await import("@/server/actions/lesson-notes");
const lessonId = "course-1-m1-l1";
let sequence = 0;
let userId: string;
beforeEach(async () => {
  userId = `notes-${++sequence}`;
  ensureAuthenticatedUser(userId);
  authMock.mockResolvedValue({ user: { id: userId, role: "aluno" } });
  await getRepositories().enrollments.create({ userId, courseId: "course-1" });
});
it("persists notes between reads and rejects stale concurrent edits without losing the winner", async () => {
  expect(await getLessonNote(lessonId)).toMatchObject({ content: "", version: 0 });
  const saved = await saveLessonNote({ lessonId, content: "Meu resumo", expectedVersion: 0 });
  expect(await getLessonNote(lessonId)).toEqual(saved);
  const results = await Promise.allSettled([
    saveLessonNote({ lessonId, content: "Primeira edição", expectedVersion: 1 }),
    saveLessonNote({ lessonId, content: "Segunda edição", expectedVersion: 1 }),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  expect(await getLessonNote(lessonId)).toMatchObject({ content: "Primeira edição", version: 2 });
});
it("isolates notes by authenticated user and rejects access without enrollment", async () => {
  await saveLessonNote({ lessonId, content: "Privado", expectedVersion: 0 });
  const otherId = `${userId}-other`;
  ensureAuthenticatedUser(otherId);
  authMock.mockResolvedValue({ user: { id: otherId, role: "aluno" } });
  await expect(getLessonNote(lessonId)).rejects.toThrow("matriculado");
  await getRepositories().enrollments.create({ userId: otherId, courseId: "course-1" });
  expect(await getLessonNote(lessonId)).toMatchObject({ content: "", version: 0 });
});
it("validates action length and requires authentication", async () => {
  expect(
    await saveLessonNoteAction({ lessonId, content: "x".repeat(50001), expectedVersion: 0 }),
  ).toMatchObject({ ok: false });
  authMock.mockResolvedValue(null);
  await expect(getLessonNote(lessonId)).rejects.toThrow("Autenticação");
});
