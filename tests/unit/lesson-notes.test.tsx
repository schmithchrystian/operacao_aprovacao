import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const { read, save, push, replace } = vi.hoisted(() => ({
  read: vi.fn(),
  save: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
vi.mock("@/server/actions/lesson-notes", () => ({
  getLessonNoteAction: read,
  saveLessonNoteAction: save,
}));
import { LessonNotes } from "@/components/lessons/lesson-notes";
beforeEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  read.mockReset();
  save.mockReset();
  push.mockReset();
  replace.mockReset();
  read.mockResolvedValue({
    ok: true,
    data: { lessonId: "lesson-1", content: "Já salvo", version: 2, updatedAt: null },
  });
});
describe("LessonNotes", () => {
  it("loads saved notes and saves edits with their expected version", async () => {
    const user = userEvent.setup();
    render(<LessonNotes lessonId="lesson-1" />);
    const textarea = await screen.findByDisplayValue("Já salvo");
    await user.clear(textarea);
    await user.type(textarea, "Rever artigo 5º da CF.");
    save.mockResolvedValue({
      ok: true,
      data: {
        lessonId: "lesson-1",
        content: "Rever artigo 5º da CF.",
        version: 3,
        updatedAt: null,
      },
    });
    await user.click(screen.getByRole("button", { name: "Salvar anotações" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        lessonId: "lesson-1",
        content: "Rever artigo 5º da CF.",
        expectedVersion: 2,
      }),
    );
    await screen.findByText("Anotações salvas.");
  });
  it("preserves local text on conflict and requires an explicit version choice", async () => {
    const user = userEvent.setup();
    render(<LessonNotes lessonId="lesson-1" />);
    const textarea = await screen.findByDisplayValue("Já salvo");
    await user.clear(textarea);
    await user.type(textarea, "Minha versão");
    save.mockResolvedValue({ ok: false, error: { code: "CONFLICT", message: "Conflito" } });
    read.mockResolvedValue({
      ok: true,
      data: { lessonId: "lesson-1", content: "Outra versão", version: 3, updatedAt: null },
    });
    await user.click(screen.getByRole("button", { name: "Salvar anotações" }));
    await screen.findByText("Outra versão");
    expect((textarea as HTMLTextAreaElement).value).toBe("Minha versão");
    await user.click(screen.getByRole("button", { name: "Usar versão salva" }));
    expect((textarea as HTMLTextAreaElement).value).toBe("Outra versão");
  });
});

it("flushes pending edits before an internal link navigation", async () => {
  const user = userEvent.setup();
  render(
    <>
      <LessonNotes lessonId="lesson-1" />
      <Link href="/cursos">Ir aos cursos</Link>
    </>,
  );
  const textarea = await screen.findByDisplayValue("Já salvo");
  await user.clear(textarea);
  await user.type(textarea, "Antes de sair");
  let finish!: (value: unknown) => void;
  save.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await user.click(screen.getByRole("link", { name: "Ir aos cursos" }));
  expect(save).toHaveBeenCalledWith({
    lessonId: "lesson-1",
    content: "Antes de sair",
    expectedVersion: 2,
  });
  expect(push).not.toHaveBeenCalled();
  finish({
    ok: true,
    data: { lessonId: "lesson-1", content: "Antes de sair", version: 3, updatedAt: null },
  });
  await waitFor(() => expect(push).toHaveBeenCalledWith("/cursos"));
});
it("keeps the editor open when saving before navigation fails", async () => {
  const user = userEvent.setup();
  render(
    <>
      <LessonNotes lessonId="lesson-1" />
      <Link href="/cursos">Sair</Link>
    </>,
  );
  const textarea = await screen.findByDisplayValue("Já salvo");
  await user.type(textarea, " nova nota");
  save.mockResolvedValue({
    ok: false,
    error: { code: "INTERNAL_ERROR", message: "Tente novamente" },
  });
  await user.click(screen.getByRole("link", { name: "Sair" }));
  await screen.findByRole("alert");
  expect(push).not.toHaveBeenCalled();
  expect((textarea as HTMLTextAreaElement).value).toContain("nova nota");
});

it("saves before applying a browser history navigation", async () => {
  window.history.replaceState(null, "", "/aula");
  const user = userEvent.setup();
  render(<LessonNotes lessonId="lesson-1" />);
  const textarea = await screen.findByDisplayValue("Já salvo");
  await user.type(textarea, " anotação");
  save.mockResolvedValue({
    ok: true,
    data: { lessonId: "lesson-1", content: "Já salvo anotação", version: 3, updatedAt: null },
  });
  await act(async () => {
    window.history.pushState(null, "", "/dashboard");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await waitFor(() => expect(replace).toHaveBeenCalledWith(expect.stringContaining("/dashboard")));
  expect(save).toHaveBeenCalled();
});
