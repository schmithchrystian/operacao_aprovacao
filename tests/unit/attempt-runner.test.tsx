import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AttemptDTO } from "@/contracts/simulations";

const {
  pushMock,
  submitAttemptActionMock,
  toggleFavoriteActionMock,
  toastSuccessMock,
  toastErrorMock,
  toastInfoMock,
  toastMessageMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  submitAttemptActionMock: vi.fn(),
  toggleFavoriteActionMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastInfoMock: vi.fn(),
  toastMessageMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock, info: toastInfoMock, message: toastMessageMock },
}));

vi.mock("@/server/actions/simulations", () => ({
  submitAttemptAction: submitAttemptActionMock,
  toggleFavoriteAction: toggleFavoriteActionMock,
}));

const { AttemptRunner } = await import("@/components/simulations/attempt-runner");

function makeAttempt(overrides: Partial<AttemptDTO> = {}): AttemptDTO {
  return {
    id: "attempt-1",
    mockExamId: "exam-1",
    mockExamTitle: "Simulado de Teste",
    status: "IN_PROGRESS",
    startedAt: "2026-07-13T10:00:00.000Z",
    timeLimitSeconds: null,
    remainingSeconds: null,
    questions: [
      {
        questionId: "q1",
        statement: "Qual a capital do Brasil?",
        subjectName: "Geografia",
        topicName: null,
        board: null,
        difficulty: "EASY",
        options: [
          { id: "q1-a", label: "A", text: "Rio de Janeiro" },
          { id: "q1-b", label: "B", text: "Brasília" },
        ],
      },
      {
        questionId: "q2",
        statement: "Quanto é 2 + 2?",
        subjectName: "Matemática",
        topicName: null,
        board: null,
        difficulty: "EASY",
        options: [
          { id: "q2-a", label: "A", text: "3" },
          { id: "q2-b", label: "B", text: "4" },
        ],
      },
    ],
    ...overrides,
  };
}

describe("AttemptRunner", () => {
  beforeEach(() => {
    pushMock.mockReset();
    submitAttemptActionMock.mockReset();
    toggleFavoriteActionMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    toastInfoMock.mockReset();
    toastMessageMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("nunca exibe gabarito — nenhuma opção carrega informação de resposta correta", () => {
    const attempt = makeAttempt();
    render(<AttemptRunner attempt={attempt} initialFavoriteQuestionIds={[]} />);

    // A questão é exibida sem nenhuma indicação de "correta"/"errada" (estruturalmente
    // impossível: `AttemptQuestionOptionDTO` não tem `isCorrect`) — aqui reforça que a UI
    // também não inventa esse dado a partir de outro lugar.
    expect(screen.queryByText(/gabarito/i)).toBeNull();
    expect(screen.queryByText(/correta/i)).toBeNull();
  });

  it("mostra a primeira questão e o contador de respondidas/não respondidas", () => {
    render(<AttemptRunner attempt={makeAttempt()} initialFavoriteQuestionIds={[]} />);

    expect(screen.getByText(/questão 1 de 2/i)).toBeTruthy();
    expect(screen.getByText("Qual a capital do Brasil?")).toBeTruthy();
    expect(screen.getByText(/0 respondidas · 2 não respondidas/i)).toBeTruthy();
  });

  it("selecionar uma alternativa atualiza o contador de respondidas", async () => {
    const user = userEvent.setup();
    render(<AttemptRunner attempt={makeAttempt()} initialFavoriteQuestionIds={[]} />);

    await user.click(screen.getByRole("radio", { name: /brasília/i }));

    expect(screen.getByText(/1 respondida · 1 não respondida/i)).toBeTruthy();
  });

  it("marcar para revisar alterna o rótulo do botão", async () => {
    const user = userEvent.setup();
    render(<AttemptRunner attempt={makeAttempt()} initialFavoriteQuestionIds={[]} />);

    await user.click(screen.getByRole("button", { name: /marcar para revisar/i }));
    expect(screen.getByRole("button", { name: /remover marcação/i })).toBeTruthy();
    expect(screen.getByText(/1 marcada para revisar/i)).toBeTruthy();
  });

  it("finaliza enviando só {attemptId, answers:[{questionId, selectedOptionId}]} — sem nota/pontos/tempo", async () => {
    submitAttemptActionMock.mockResolvedValue({
      ok: true,
      data: { attemptId: "attempt-1" },
    });
    const user = userEvent.setup();
    render(<AttemptRunner attempt={makeAttempt()} initialFavoriteQuestionIds={[]} />);

    await user.click(screen.getByRole("radio", { name: /brasília/i }));
    await user.click(screen.getByRole("button", { name: "Finalizar simulado" }));

    expect(screen.getByText(/você respondeu 1 de 2 questões/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    await waitFor(() => expect(submitAttemptActionMock).toHaveBeenCalledTimes(1));
    expect(submitAttemptActionMock).toHaveBeenCalledWith({
      attemptId: "attempt-1",
      answers: [
        { questionId: "q1", selectedOptionId: "q1-b" },
        { questionId: "q2", selectedOptionId: null },
      ],
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/simulados/attempt-1/resultado"));
  });

  it("volta e revisar fecha o diálogo sem enviar", async () => {
    const user = userEvent.setup();
    render(<AttemptRunner attempt={makeAttempt()} initialFavoriteQuestionIds={[]} />);

    await user.click(screen.getByRole("button", { name: "Finalizar simulado" }));
    await user.click(screen.getByRole("button", { name: /voltar e revisar/i }));

    expect(submitAttemptActionMock).not.toHaveBeenCalled();
  });

  it("tentativa já finalizada em outra aba (CONFLICT): navega para o resultado com aviso", async () => {
    submitAttemptActionMock.mockResolvedValue({
      ok: false,
      error: { code: "CONFLICT", message: "Esta tentativa já foi finalizada." },
    });
    const user = userEvent.setup();
    render(<AttemptRunner attempt={makeAttempt()} initialFavoriteQuestionIds={[]} />);

    await user.click(screen.getByRole("button", { name: "Finalizar simulado" }));
    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/simulados/attempt-1/resultado"));
    expect(toastInfoMock).toHaveBeenCalled();
  });

  it("sem tempo limite, exibe 'Sem limite de tempo' e nunca envia automaticamente", () => {
    render(
      <AttemptRunner
        attempt={makeAttempt({ timeLimitSeconds: null, remainingSeconds: null })}
        initialFavoriteQuestionIds={[]}
      />,
    );

    expect(screen.getByText(/sem limite de tempo/i)).toBeTruthy();
    expect(submitAttemptActionMock).not.toHaveBeenCalled();
  });

  it("ao carregar já com o tempo esgotado (remainingSeconds=0), envia automaticamente uma única vez", async () => {
    submitAttemptActionMock.mockResolvedValue({ ok: true, data: { attemptId: "attempt-1" } });

    render(
      <AttemptRunner
        attempt={makeAttempt({ timeLimitSeconds: 60, remainingSeconds: 0 })}
        initialFavoriteQuestionIds={[]}
      />,
    );

    await waitFor(() => expect(submitAttemptActionMock).toHaveBeenCalledTimes(1));
    expect(submitAttemptActionMock).toHaveBeenCalledWith({
      attemptId: "attempt-1",
      answers: [
        { questionId: "q1", selectedOptionId: null },
        { questionId: "q2", selectedOptionId: null },
      ],
    });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/simulados/attempt-1/resultado"));
  });

  it("o cronômetro decrementa a exibição um segundo após montar", async () => {
    vi.useFakeTimers();

    render(
      <AttemptRunner
        attempt={makeAttempt({ timeLimitSeconds: 600, remainingSeconds: 65 })}
        initialFavoriteQuestionIds={[]}
      />,
    );

    expect(screen.getByText("1:05")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByText("1:04")).toBeTruthy();
    expect(submitAttemptActionMock).not.toHaveBeenCalled();
  });

  it("favoritar uma questão chama toggleFavoriteAction para o questionId atual", async () => {
    toggleFavoriteActionMock.mockResolvedValue({ ok: true, data: { questionId: "q1", isFavorite: true } });
    const user = userEvent.setup();
    render(<AttemptRunner attempt={makeAttempt()} initialFavoriteQuestionIds={[]} />);

    await user.click(screen.getByRole("button", { name: /adicionar aos favoritos/i }));

    await waitFor(() => expect(toggleFavoriteActionMock).toHaveBeenCalledWith({ questionId: "q1" }));
  });
});
