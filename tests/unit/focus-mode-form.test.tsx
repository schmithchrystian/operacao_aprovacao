import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FocusSessionDTO } from "@/contracts/focus";

const { startFocusSessionActionMock, listTopicOptionsActionMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  startFocusSessionActionMock: vi.fn(),
  listTopicOptionsActionMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/focus", () => ({
  startFocusSessionAction: startFocusSessionActionMock,
}));

vi.mock("@/server/actions/simulations", () => ({
  listTopicOptionsAction: listTopicOptionsActionMock,
}));

const { FocusModeForm } = await import("@/components/focus/focus-mode-form");

const subjects = [{ id: "subject-1", name: "Direito Constitucional" }];

function makeSession(overrides: Partial<FocusSessionDTO> = {}): FocusSessionDTO {
  return {
    id: "session-1",
    mode: "25_5",
    status: "ACTIVE",
    startedAt: "2026-07-14T10:00:00.000Z",
    endedAt: null,
    targetSeconds: 1500,
    breakSeconds: 300,
    elapsedSeconds: 0,
    subjectId: null,
    topicId: null,
    objective: null,
    cyclesPlanned: 1,
    cyclesCompleted: 0,
    ...overrides,
  };
}

describe("FocusModeForm", () => {
  beforeEach(() => {
    startFocusSessionActionMock.mockReset();
    listTopicOptionsActionMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("modo padrão (25/5): inicia a sessão com os campos opcionais convertidos para undefined", async () => {
    startFocusSessionActionMock.mockResolvedValue({ ok: true, data: makeSession() });
    const onStarted = vi.fn();
    const user = userEvent.setup();
    render(<FocusModeForm subjects={subjects} onStarted={onStarted} />);

    await user.click(screen.getByRole("button", { name: /iniciar sessão de foco/i }));

    await waitFor(() => expect(startFocusSessionActionMock).toHaveBeenCalledTimes(1));
    expect(startFocusSessionActionMock).toHaveBeenCalledWith({
      mode: "25_5",
      customFocusMinutes: undefined,
      customBreakMinutes: undefined,
      subjectId: undefined,
      topicId: undefined,
      objective: undefined,
    });
    expect(onStarted).toHaveBeenCalledWith(makeSession(), { subjectName: null, topicName: null });
  });

  it("modo personalizado exige minutos de foco antes de iniciar a sessão", async () => {
    const user = userEvent.setup();
    render(<FocusModeForm subjects={subjects} onStarted={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: /personalizado/i }));
    await user.click(screen.getByRole("button", { name: /iniciar sessão de foco/i }));

    // Campo numérico deixado em branco -> valor bruto do DOM é `""`, que `z.coerce.number()`
    // converte para `0` e falha no `.min(customMinFocusMinutes)` — mesma mensagem que o backend
    // usaria para o mesmo limite (`@/config/business`, `FOCUS.customMinFocusMinutes`).
    expect(await screen.findByText(/informe ao menos 5 minutos/i)).toBeTruthy();
    expect(startFocusSessionActionMock).not.toHaveBeenCalled();
  });

  it("modo personalizado com minutos válidos envia customFocusMinutes/customBreakMinutes", async () => {
    startFocusSessionActionMock.mockResolvedValue({ ok: true, data: makeSession({ mode: "custom" }) });
    const user = userEvent.setup();
    render(<FocusModeForm subjects={subjects} onStarted={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: /personalizado/i }));
    await user.type(screen.getByLabelText("Minutos de foco"), "45");
    await user.type(screen.getByLabelText(/minutos de pausa/i), "10");
    await user.click(screen.getByRole("button", { name: /iniciar sessão de foco/i }));

    await waitFor(() =>
      expect(startFocusSessionActionMock).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "custom", customFocusMinutes: 45, customBreakMinutes: 10 }),
      ),
    );
  });

  it("seleciona matéria/assunto e objetivo — envia os ids ao servidor e os nomes resolvidos via onStarted", async () => {
    listTopicOptionsActionMock.mockResolvedValue({
      ok: true,
      data: [{ id: "topic-1", subjectId: "subject-1", name: "Controle de constitucionalidade" }],
    });
    startFocusSessionActionMock.mockResolvedValue({
      ok: true,
      data: makeSession({ subjectId: "subject-1", topicId: "topic-1", objective: "Resolver 10 questões" }),
    });
    const onStarted = vi.fn();
    const user = userEvent.setup();
    render(<FocusModeForm subjects={subjects} onStarted={onStarted} />);

    await user.selectOptions(screen.getByLabelText(/matéria/i), "subject-1");
    await waitFor(() => expect(listTopicOptionsActionMock).toHaveBeenCalledWith({ subjectId: "subject-1" }));
    await user.selectOptions(await screen.findByLabelText(/assunto/i), "topic-1");
    await user.type(screen.getByLabelText(/objetivo desta sessão/i), "Resolver 10 questões");
    await user.click(screen.getByRole("button", { name: /iniciar sessão de foco/i }));

    await waitFor(() =>
      expect(startFocusSessionActionMock).toHaveBeenCalledWith(
        expect.objectContaining({ subjectId: "subject-1", topicId: "topic-1", objective: "Resolver 10 questões" }),
      ),
    );
    expect(onStarted).toHaveBeenCalledWith(
      expect.objectContaining({ subjectId: "subject-1", topicId: "topic-1" }),
      { subjectName: "Direito Constitucional", topicName: "Controle de constitucionalidade" },
    );
  });

  it("mapeia fieldErrors do servidor para o campo correspondente", async () => {
    startFocusSessionActionMock.mockResolvedValue({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados inválidos.",
        fieldErrors: { objective: ["Objetivo muito longo."] },
      },
    });
    const user = userEvent.setup();
    render(<FocusModeForm subjects={subjects} onStarted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /iniciar sessão de foco/i }));

    expect(await screen.findByText("Objetivo muito longo.")).toBeTruthy();
    expect(screen.getByText("Dados inválidos.")).toBeTruthy();
  });
});
