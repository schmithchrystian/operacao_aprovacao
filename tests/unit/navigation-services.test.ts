import { beforeEach, expect, it, vi } from "vitest";
import { ensureAuthenticatedUser } from "../helpers/authenticated-user";
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));
const { getRepositories } = await import("@/server/repositories");
const { listMyNotifications, markMyNotificationRead } =
  await import("@/server/services/navigation/notifications");
const { searchMyContent } = await import("@/server/services/navigation/search");
const { searchContentAction } = await import("@/server/actions/search");
const { __resetMockNotificationStore } =
  await import("@/server/repositories/mock/notification-repository");
const { __resetMockCourseStore } = await import("@/server/repositories/mock/course-repository");
const now = new Date("2026-09-13T12:00:00Z");
beforeEach(() => {
  __resetMockNotificationStore();
  __resetMockCourseStore();
  ensureAuthenticatedUser("navigation-reader");
  authMock.mockResolvedValue({ user: { id: "navigation-reader", role: "aluno" } });
});
it("lists only the current user's notifications and makes mark-read idempotent and owner scoped", async () => {
  const repos = getRepositories();
  const [mine, other] = await repos.notifications.createMany([
    { userId: "navigation-reader", type: "SYSTEM", title: "Meu aviso", message: "Olá", now },
    { userId: "another", type: "SYSTEM", title: "Privado", message: "Não expor", now },
  ]);
  expect(await listMyNotifications()).toMatchObject({
    total: 1,
    unreadCount: 1,
    items: [{ title: "Meu aviso" }],
  });
  await expect(markMyNotificationRead(other!.id)).rejects.toThrow("não encontrada");
  await markMyNotificationRead(mine!.id);
  await markMyNotificationRead(mine!.id);
  expect(await listMyNotifications()).toMatchObject({ unreadCount: 0, items: [{ isRead: true }] });
});
it("finds published course titles and excludes drafts", async () => {
  const repos = getRepositories();
  const course = (await repos.courses.findById("course-1"))!;
  expect((await searchMyContent(course.title, 1)).items.some((row) => row.id === course.id)).toBe(
    true,
  );
  await repos.courses.update({ id: course.id, status: "DRAFT", now });
  expect((await searchMyContent(course.title, 1)).items.some((row) => row.id === course.id)).toBe(
    false,
  );
});
it("searches lessons only with enrollment and never exposes another user's private cards", async () => {
  const repos = getRepositories();
  const lesson = (await repos.lessons.findById("course-1-m1-l1"))!;
  expect(
    (await searchMyContent(lesson.title, 1)).items.some(
      (row) => row.kind === "Aula" && row.id === lesson.id,
    ),
  ).toBe(false);
  await repos.enrollments.create({ userId: "navigation-reader", courseId: "course-1" });
  expect(
    (await searchMyContent(lesson.title, 1)).items.some(
      (row) => row.kind === "Aula" && row.id === lesson.id,
    ),
  ).toBe(true);
  const deck = await repos.flashcardDecks.create({
    userId: "another",
    subjectId: null,
    title: "Privado",
    isPublic: false,
    kind: "PERSONAL",
    now,
  });
  await repos.flashcards.create({
    deckId: deck.id,
    subjectId: null,
    topicId: null,
    question: "segredonavxyz",
    answer: "Resposta privada",
    difficulty: "EASY",
    tags: [],
    now,
  });
  expect((await searchMyContent("segredonavxyz", 1)).total).toBe(0);
});
it("rejects invalid search queries and unauthenticated access", async () => {
  expect(await searchContentAction({ query: "a" })).toMatchObject({ ok: false });
  authMock.mockResolvedValue(null);
  await expect(listMyNotifications()).rejects.toThrow("Autenticação");
  await expect(searchMyContent("curso", 1)).rejects.toThrow("Autenticação");
});
