import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ok, fail, type ActionResult } from "@/contracts/common";
import type { LessonNoteDTO } from "@/contracts/lesson-notes";
import { LessonNotes } from "@/components/lessons/lesson-notes";

const { load, save, router } = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/server/actions/lesson-notes", () => ({
  getLessonNoteAction: load,
  saveLessonNoteAction: save,
}));

const note = (content = "Texto salvo", version = 1, lessonId = "lesson-1"): LessonNoteDTO => ({
  lessonId,
  content,
  version,
  updatedAt: "2026-09-14T00:00:00.000Z",
});
const editor = () => screen.getByRole("textbox") as HTMLTextAreaElement;
async function loaded() {
  render(<LessonNotes lessonId="lesson-1" />);
  await waitFor(() => expect(editor().value).toBe("Texto salvo"));
}

describe("Anotações — revisão independente da entrega para usuários", () => {
  beforeEach(() => {
    router.push.mockReset();
    router.replace.mockReset();
    load.mockReset().mockResolvedValue(ok(note()));
    save
      .mockReset()
      .mockImplementation(async (input) => ok(note(input.content, input.expectedVersion + 1)));
  });
  afterEach(cleanup);

  it("recupera o texto do servidor e envia a versão lida ao salvar", async () => {
    await loaded();
    fireEvent.change(editor(), { target: { value: "Meu resumo" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar anotações" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        lessonId: "lesson-1",
        content: "Meu resumo",
        expectedVersion: 1,
      }),
    );
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Anotações salvas."));
  });

  it("mantém o rascunho quando a conexão falha e permite tentar novamente", async () => {
    save.mockRejectedValueOnce(new Error("network"));
    await loaded();
    fireEvent.change(editor(), { target: { value: "Não perder" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar anotações" }));
    await screen.findByRole("alert");
    expect(editor().value).toBe("Não perder");
    fireEvent.click(screen.getByRole("button", { name: "Salvar anotações" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("apresenta conflito sem sobrescrever nenhuma versão automaticamente", async () => {
    save.mockResolvedValueOnce(fail("CONFLICT", "Outra janela alterou."));
    load.mockResolvedValueOnce(ok(note())).mockResolvedValueOnce(ok(note("Texto da outra aba", 2)));
    await loaded();
    fireEvent.change(editor(), { target: { value: "Texto desta aba" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar anotações" }));
    await screen.findByText("Texto da outra aba");
    expect(editor().value).toBe("Texto desta aba");
    expect(save).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Usar versão salva" }));
    expect(editor().value).toBe("Texto da outra aba");
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("usa a versão atual quando o aluno decide substituir após conflito", async () => {
    save.mockResolvedValueOnce(fail("CONFLICT", "Outra janela alterou."));
    load.mockResolvedValueOnce(ok(note())).mockResolvedValueOnce(ok(note("Outro texto", 4)));
    await loaded();
    fireEvent.change(editor(), { target: { value: "Meu texto escolhido" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar anotações" }));
    fireEvent.click(await screen.findByRole("button", { name: "Salvar minha versão" }));
    await waitFor(() =>
      expect(save).toHaveBeenLastCalledWith({
        lessonId: "lesson-1",
        content: "Meu texto escolhido",
        expectedVersion: 4,
      }),
    );
  });

  it("não permite editar antes da leitura inicial e recupera uma falha de carregamento", async () => {
    load.mockResolvedValueOnce(fail("INTERNAL_ERROR", "Falha temporária."));
    render(<LessonNotes lessonId="lesson-1" />);
    expect(editor().disabled).toBe(true);
    fireEvent.click(await screen.findByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(editor().value).toBe("Texto salvo"));
    expect(editor().disabled).toBe(false);
  });

  it("ignora resposta atrasada da aula anterior ao trocar de aula", async () => {
    let resolveOld!: (value: ActionResult<LessonNoteDTO>) => void;
    load.mockReturnValueOnce(
      new Promise<ActionResult<LessonNoteDTO>>((resolve) => {
        resolveOld = resolve;
      }),
    );
    load.mockResolvedValueOnce(ok(note("Aula nova", 1, "lesson-2")));
    const view = render(<LessonNotes lessonId="lesson-1" />);
    view.rerender(<LessonNotes lessonId="lesson-2" />);
    await waitFor(() => expect(editor().value).toBe("Aula nova"));
    await act(async () => resolveOld(ok(note("Aula antiga"))));
    expect(editor().value).toBe("Aula nova");
  });

  it("aguarda o salvamento antes de navegar por um link interno", async () => {
    let finish!: (value: ActionResult<LessonNoteDTO>) => void;
    save.mockReturnValueOnce(
      new Promise<ActionResult<LessonNoteDTO>>((resolve) => {
        finish = resolve;
      }),
    );
    render(
      <>
        <LessonNotes lessonId="lesson-1" />
        <a href="/proxima-aula">Próxima aula</a>
      </>,
    );
    await waitFor(() => expect(editor().value).toBe("Texto salvo"));
    fireEvent.change(editor(), { target: { value: "Resumo antes de sair" } });
    fireEvent.click(screen.getByRole("link", { name: "Próxima aula" }));
    expect(save).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => finish(ok(note("Resumo antes de sair", 2))));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/proxima-aula"));
  });

  it("bloqueia a navegação e preserva o texto se salvar falhar", async () => {
    save.mockResolvedValueOnce(fail("INTERNAL_ERROR", "Não foi possível salvar."));
    render(
      <>
        <LessonNotes lessonId="lesson-1" />
        <a href="/proxima-aula">Próxima aula</a>
      </>,
    );
    await waitFor(() => expect(editor().value).toBe("Texto salvo"));
    fireEvent.change(editor(), { target: { value: "Texto preservado" } });
    fireEvent.click(screen.getByRole("link", { name: "Próxima aula" }));
    await screen.findByRole("alert");
    expect(editor().value).toBe("Texto preservado");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("salva também edições feitas durante a gravação antes de navegar", async () => {
    let finish!: (value: ActionResult<LessonNoteDTO>) => void;
    save.mockReturnValueOnce(
      new Promise<ActionResult<LessonNoteDTO>>((resolve) => {
        finish = resolve;
      }),
    );
    render(
      <>
        <LessonNotes lessonId="lesson-1" />
        <a href="/proxima-aula">Próxima aula</a>
      </>,
    );
    await waitFor(() => expect(editor().value).toBe("Texto salvo"));
    fireEvent.change(editor(), { target: { value: "Primeira edição" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar anotações" }));
    fireEvent.change(editor(), { target: { value: "Edição final" } });
    fireEvent.click(screen.getByRole("link", { name: "Próxima aula" }));
    await act(async () => finish(ok(note("Primeira edição", 2))));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/proxima-aula"));
    expect(save).toHaveBeenLastCalledWith({
      lessonId: "lesson-1",
      content: "Edição final",
      expectedVersion: 2,
    });
  });
});
