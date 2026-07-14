import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { pushMock, createAttemptActionMock, listTopicOptionsActionMock, toastSuccessMock, toastErrorMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    createAttemptActionMock: vi.fn(),
    listTopicOptionsActionMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/simulations", () => ({
  createAttemptAction: createAttemptActionMock,
  listTopicOptionsAction: listTopicOptionsActionMock,
}));

const { MockExamBuilderForm } = await import("@/components/simulations/mock-exam-builder-form");

const contests = [
  { id: "contest-1", name: "Polícia Militar" },
  { id: "contest-2", name: "Guarda Civil Municipal" },
];
const courses = [
  { id: "course-1", title: "PM — Curso A", contestId: "contest-1" },
  { id: "course-2", title: "GCM — Curso B", contestId: "contest-2" },
];
const subjects = [
  { id: "subject-1", name: "Direito Penal" },
  { id: "subject-2", name: "Língua Portuguesa" },
];

describe("MockExamBuilderForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    createAttemptActionMock.mockReset();
    listTopicOptionsActionMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("envia os valores padrão (10 questões, modo aleatório, filtros vazios) ao montar sem tocar em nada", async () => {
    createAttemptActionMock.mockResolvedValue({ ok: true, data: { id: "attempt-novo" } });
    const user = userEvent.setup();

    render(<MockExamBuilderForm contests={contests} courses={courses} subjects={subjects} />);
    await user.click(screen.getByRole("button", { name: /montar simulado/i }));

    await waitFor(() => expect(createAttemptActionMock).toHaveBeenCalledTimes(1));
    expect(createAttemptActionMock).toHaveBeenCalledWith({
      contestId: undefined,
      courseId: undefined,
      subjectId: undefined,
      topicId: undefined,
      board: undefined,
      difficulty: undefined,
      quantity: 10,
      timeLimitMinutes: undefined,
      mode: "RANDOM",
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/simulados/attempt-novo"));
  });

  it("filtra o curso pelo concurso selecionado (cascata em memória)", async () => {
    const user = userEvent.setup();
    render(<MockExamBuilderForm contests={contests} courses={courses} subjects={subjects} />);

    expect(screen.getByText("PM — Curso A")).toBeTruthy();
    expect(screen.getByText("GCM — Curso B")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText(/^concurso$/i), "contest-2");

    expect(screen.queryByText("PM — Curso A")).toBeNull();
    expect(screen.getByText("GCM — Curso B")).toBeTruthy();
  });

  it("busca os assuntos da matéria selecionada e habilita o select de assunto", async () => {
    listTopicOptionsActionMock.mockResolvedValue({
      ok: true,
      data: [{ id: "topic-1", subjectId: "subject-1", name: "Teoria do Crime" }],
    });
    const user = userEvent.setup();
    render(<MockExamBuilderForm contests={contests} courses={courses} subjects={subjects} />);

    const topicSelect = screen.getByLabelText(/^assunto$/i);
    expect(topicSelect.hasAttribute("disabled")).toBe(true);

    await user.selectOptions(screen.getByLabelText(/^matéria$/i), "subject-1");

    await waitFor(() => expect(listTopicOptionsActionMock).toHaveBeenCalledWith({ subjectId: "subject-1" }));
    await screen.findByText("Teoria do Crime");
    await waitFor(() => expect(screen.getByLabelText(/^assunto$/i).hasAttribute("disabled")).toBe(false));
  });

  it("mostra erro de validação client-side e não envia quando a quantidade é 0", async () => {
    const user = userEvent.setup();
    render(<MockExamBuilderForm contests={contests} courses={courses} subjects={subjects} />);

    const quantityInput = screen.getByLabelText(/quantidade de questões/i);
    await user.clear(quantityInput);
    await user.type(quantityInput, "0");
    await user.click(screen.getByRole("button", { name: /montar simulado/i }));

    expect(await screen.findByText(/informe ao menos 1 questão/i)).toBeTruthy();
    expect(createAttemptActionMock).not.toHaveBeenCalled();
  });

  it("mapeia fieldErrors do servidor para o campo correspondente", async () => {
    createAttemptActionMock.mockResolvedValue({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados inválidos.",
        fieldErrors: { quantity: ["Máximo de 120 questões."] },
      },
    });
    const user = userEvent.setup();
    render(<MockExamBuilderForm contests={contests} courses={courses} subjects={subjects} />);

    await user.click(screen.getByRole("button", { name: /montar simulado/i }));

    expect(await screen.findByText("Máximo de 120 questões.")).toBeTruthy();
    expect(screen.getByText("Dados inválidos.")).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("modo 'Só as que já errei' é enviado quando selecionado", async () => {
    createAttemptActionMock.mockResolvedValue({ ok: true, data: { id: "attempt-2" } });
    const user = userEvent.setup();
    render(<MockExamBuilderForm contests={contests} courses={courses} subjects={subjects} />);

    await user.click(screen.getByRole("radio", { name: /só as que já errei/i }));
    await user.click(screen.getByRole("button", { name: /montar simulado/i }));

    await waitFor(() =>
      expect(createAttemptActionMock).toHaveBeenCalledWith(expect.objectContaining({ mode: "WRONG_ONLY" })),
    );
  });
});
