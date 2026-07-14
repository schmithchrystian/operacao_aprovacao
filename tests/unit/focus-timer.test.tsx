import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { FocusSessionDTO } from "@/contracts/focus";

const { finishFocusSessionActionMock, toastErrorMock, toastInfoMock, toastMessageMock } = vi.hoisted(() => ({
  finishFocusSessionActionMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastInfoMock: vi.fn(),
  toastMessageMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: toastErrorMock, info: toastInfoMock, message: toastMessageMock },
}));

vi.mock("@/server/actions/focus", () => ({
  finishFocusSessionAction: finishFocusSessionActionMock,
}));

const { FocusTimer } = await import("@/components/focus/focus-timer");

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

function heartbeatOkResponse(session: FocusSessionDTO, flags: string[] = []) {
  return {
    status: 200,
    json: async () => ({ ok: true, data: { session, flags } }),
  };
}

function heartbeatConflictResponse() {
  return {
    status: 409,
    json: async () => ({
      ok: false,
      error: { code: "CONFLICT", message: "Esta sessão de foco não está mais ativa." },
    }),
  };
}

function parseBody(fetchMock: ReturnType<typeof vi.fn>, callIndex: number): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[callIndex] as [string, RequestInit];
  return JSON.parse(init.body as string);
}

describe("FocusTimer", () => {
  beforeEach(() => {
    finishFocusSessionActionMock.mockReset();
    toastErrorMock.mockReset();
    toastInfoMock.mockReset();
    toastMessageMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("ao montar, envia heartbeat só com sinais brutos — nunca elapsedSeconds/pontos/'concluído'", async () => {
    const fetchMock = vi.fn().mockResolvedValue(heartbeatOkResponse(makeSession({ elapsedSeconds: 15 })));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FocusTimer session={makeSession()} subjectName={null} topicName={null} onFinished={vi.fn()} onDiscarded={vi.fn()} />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/focus/heartbeat");

    const body = parseBody(fetchMock, 0);
    expect(body).toMatchObject({ sessionId: "session-1", tabVisible: true, interacting: true });
    expect(typeof body.clientTimestamp).toBe("number");
    // Só os 4 sinais brutos do contrato — nunca um campo "concluído"/pontos/tempo calculado.
    expect(Object.keys(body).sort()).toEqual(["clientTimestamp", "interacting", "sessionId", "tabVisible"]);

    // A exibição reflete o valor devolvido pelo SERVIDOR (25:00 - 15s = 24:45), nunca um cálculo local.
    await waitFor(() => expect(screen.getByText("24:45")).toBeTruthy());
  });

  it("pausar fecha o heartbeat corrente com sinceridade; retomar fecha o hiato pausado como idle antes de recontar", async () => {
    const fetchMock = vi.fn().mockResolvedValue(heartbeatOkResponse(makeSession()));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FocusTimer session={makeSession()} subjectName={null} topicName={null} onFinished={vi.fn()} onDiscarded={vi.fn()} />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /^pausar$/i }));

    // O clique de pausa dispara um heartbeat "de fechamento" que ainda credita com sinceridade o
    // tempo ativo até este instante — `interacting` só passa a `false` a PARTIR do próximo envio.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(parseBody(fetchMock, 1).interacting).toBe(true);
    expect(await screen.findByRole("button", { name: /^retomar$/i })).toBeTruthy();
    expect(screen.getByText(/sessão pausada/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^retomar$/i }));

    // O heartbeat de retomada fecha o hiato pausado como IDLE — nunca credita o tempo pausado.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(parseBody(fetchMock, 2).interacting).toBe(false);
  });

  it("heartbeat retorna CONFLICT (sessão encerrada em outro lugar): aciona onDiscarded e para de enviar heartbeats", async () => {
    const onDiscarded = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(heartbeatOkResponse(makeSession()))
      .mockResolvedValue(heartbeatConflictResponse());
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FocusTimer session={makeSession()} subjectName={null} topicName={null} onFinished={vi.fn()} onDiscarded={onDiscarded} />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /^pausar$/i }));

    await waitFor(() => expect(onDiscarded).toHaveBeenCalledTimes(1));
    expect(onDiscarded.mock.calls[0]![0]).toMatch(/não está mais ativa/i);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ao encerrar, coleta a autoavaliação e repassa o FinishFocusResultDTO exato do servidor — nunca calcula pontuação no cliente", async () => {
    // O heartbeat também devolve `objective` (persiste no servidor entre heartbeats) — se o mock
    // não o incluísse, o valor seria sobrescrito para `null` na primeira resposta de heartbeat.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(heartbeatOkResponse(makeSession({ elapsedSeconds: 1400, objective: "Resolver 10 questões" })));
    vi.stubGlobal("fetch", fetchMock);
    const onFinished = vi.fn();

    finishFocusSessionActionMock.mockResolvedValue({
      ok: true,
      data: {
        session: makeSession({ elapsedSeconds: 1400, status: "FINISHED", cyclesCompleted: 1 }),
        scored: true,
        points: 50,
        xp: 50,
        reasonNotScored: null,
      },
    });

    render(
      <FocusTimer
        session={makeSession({ objective: "Resolver 10 questões" })}
        subjectName="Direito Constitucional"
        topicName={null}
        onFinished={onFinished}
        onDiscarded={vi.fn()}
      />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /encerrar sessão/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/você concluiu: "resolver 10 questões"/i)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Sim" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "4" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /encerrar sessão/i }));

    await waitFor(() => expect(finishFocusSessionActionMock).toHaveBeenCalledTimes(1));
    expect(finishFocusSessionActionMock).toHaveBeenCalledWith({
      sessionId: "session-1",
      goalAchieved: true,
      contentStudied: undefined,
      focusLevel: 4,
      doubtNote: undefined,
    });

    await waitFor(() =>
      expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ scored: true, points: 50, xp: 50 })),
    );
  });

  it("'Som ambiente' é um toggle honesto — nunca toca áudio, só avisa que o recurso ainda não existe", async () => {
    const fetchMock = vi.fn().mockResolvedValue(heartbeatOkResponse(makeSession()));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FocusTimer session={makeSession()} subjectName={null} topicName={null} onFinished={vi.fn()} onDiscarded={vi.fn()} />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /som ambiente/i }));

    expect(toastInfoMock).toHaveBeenCalledTimes(1);
    expect(toastInfoMock.mock.calls[0]![0]).toMatch(/próxima atualização/i);
    // Nenhum elemento de áudio é criado/tocado por este botão.
    expect(document.querySelector("audio")).toBeNull();
  });

  it("modo sem alvo (cronômetro livre) não exibe barra de progresso e não força encerramento automático", async () => {
    const fetchMock = vi.fn().mockResolvedValue(heartbeatOkResponse(makeSession({ mode: "free", targetSeconds: 0, breakSeconds: 0 })));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FocusTimer
        session={makeSession({ mode: "free", targetSeconds: 0, breakSeconds: 0 })}
        subjectName={null}
        topicName={null}
        onFinished={vi.fn()}
        onDiscarded={vi.fn()}
      />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(screen.getByText(/cronômetro livre — sem alvo definido/i)).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("tempo esgotado (elapsedSeconds do servidor atinge o alvo): pausa e abre o formulário de encerramento automaticamente", async () => {
    // O alvo é atingido pela resposta do PRÓPRIO heartbeat (fonte de verdade do servidor) — não
    // pelo tique visual local — mesmo espírito da regra crítica do componente.
    const fetchMock = vi.fn().mockResolvedValue(heartbeatOkResponse(makeSession({ targetSeconds: 5, elapsedSeconds: 5 })));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FocusTimer
        session={makeSession({ mode: "custom", targetSeconds: 5, breakSeconds: 0, elapsedSeconds: 0 })}
        subjectName={null}
        topicName={null}
        onFinished={vi.fn()}
        onDiscarded={vi.fn()}
      />,
    );

    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(toastMessageMock).toHaveBeenCalled();
    // Sem "Retomar" disponível — o alvo já foi atingido, só resta encerrar.
    expect(screen.queryByRole("button", { name: /^retomar$/i })).toBeNull();
  });
});
