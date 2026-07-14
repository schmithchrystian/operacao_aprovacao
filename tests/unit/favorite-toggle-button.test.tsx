import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { toggleFavoriteActionMock, toastErrorMock } = vi.hoisted(() => ({
  toggleFavoriteActionMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/server/actions/simulations", () => ({
  toggleFavoriteAction: toggleFavoriteActionMock,
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));

const { FavoriteToggleButton } = await import("@/components/simulations/favorite-toggle-button");

describe("FavoriteToggleButton", () => {
  beforeEach(() => {
    toggleFavoriteActionMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("parte não favoritado, atualiza otimisticamente e confirma com o resultado do servidor", async () => {
    toggleFavoriteActionMock.mockResolvedValue({ ok: true, data: { questionId: "q1", isFavorite: true } });
    const user = userEvent.setup();

    render(<FavoriteToggleButton questionId="q1" initialFavorite={false} />);
    const button = screen.getByRole("button", { name: /adicionar aos favoritos/i });
    expect(button.getAttribute("aria-pressed")).toBe("false");

    await user.click(button);

    await waitFor(() => expect(toggleFavoriteActionMock).toHaveBeenCalledWith({ questionId: "q1" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /remover dos favoritos/i }).getAttribute("aria-pressed")).toBe(
        "true",
      ),
    );
  });

  it("reverte o estado otimista e mostra erro quando o servidor falha", async () => {
    toggleFavoriteActionMock.mockResolvedValue({
      ok: false,
      error: { code: "NOT_FOUND", message: "Questão não encontrada." },
    });
    const user = userEvent.setup();

    render(<FavoriteToggleButton questionId="q1" initialFavorite={false} />);
    await user.click(screen.getByRole("button", { name: /adicionar aos favoritos/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Questão não encontrada."));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /adicionar aos favoritos/i }).getAttribute("aria-pressed")).toBe(
        "false",
      ),
    );
  });

  it("chama onToggled com o novo estado", async () => {
    toggleFavoriteActionMock.mockResolvedValue({ ok: true, data: { questionId: "q1", isFavorite: false } });
    const onToggled = vi.fn();
    const user = userEvent.setup();

    render(<FavoriteToggleButton questionId="q1" initialFavorite onToggled={onToggled} />);
    await user.click(screen.getByRole("button", { name: /remover dos favoritos/i }));

    await waitFor(() => expect(onToggled).toHaveBeenCalledWith(false));
  });
});
