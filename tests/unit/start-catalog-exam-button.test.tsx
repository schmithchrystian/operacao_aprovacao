import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { pushMock, createAttemptActionMock, toastErrorMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  createAttemptActionMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));

vi.mock("@/server/actions/simulations", () => ({
  createAttemptAction: createAttemptActionMock,
}));

const { StartCatalogExamButton } = await import("@/components/simulations/start-catalog-exam-button");

describe("StartCatalogExamButton", () => {
  beforeEach(() => {
    pushMock.mockReset();
    createAttemptActionMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("cria a tentativa com o mockExamId do catálogo e navega para a resolução", async () => {
    createAttemptActionMock.mockResolvedValue({ ok: true, data: { id: "attempt-catalogo-1" } });
    const user = userEvent.setup();

    render(<StartCatalogExamButton mockExamId="mock-exam-pm" />);
    await user.click(screen.getByRole("button", { name: /iniciar simulado/i }));

    await waitFor(() => expect(createAttemptActionMock).toHaveBeenCalledWith({ mockExamId: "mock-exam-pm" }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/simulados/attempt-catalogo-1"));
  });

  it("mostra um toast de erro e não navega quando a criação falha", async () => {
    createAttemptActionMock.mockResolvedValue({
      ok: false,
      error: { code: "NOT_FOUND", message: "Este simulado não possui questões." },
    });
    const user = userEvent.setup();

    render(<StartCatalogExamButton mockExamId="mock-exam-vazio" />);
    await user.click(screen.getByRole("button", { name: /iniciar simulado/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Este simulado não possui questões."));
    expect(pushMock).not.toHaveBeenCalled();
  });
});
