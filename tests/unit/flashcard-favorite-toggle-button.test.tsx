import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { toggleFavoriteActionMock, toastErrorMock } = vi.hoisted(() => ({
  toggleFavoriteActionMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/server/actions/flashcards", () => ({
  toggleFavoriteAction: toggleFavoriteActionMock,
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));

const { FlashcardFavoriteToggleButton } = await import("@/components/flashcards/favorite-toggle-button");

describe("FlashcardFavoriteToggleButton", () => {
  beforeEach(() => {
    toggleFavoriteActionMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("parte não favoritado, atualiza otimisticamente e confirma com o resultado do servidor", async () => {
    toggleFavoriteActionMock.mockResolvedValue({ ok: true, data: { flashcardId: "card-1", isFavorite: true } });
    const user = userEvent.setup();

    render(<FlashcardFavoriteToggleButton flashcardId="card-1" initialFavorite={false} />);
    const button = screen.getByRole("button", { name: /adicionar aos favoritos/i });
    expect(button.getAttribute("aria-pressed")).toBe("false");

    await user.click(button);

    await waitFor(() => expect(toggleFavoriteActionMock).toHaveBeenCalledWith({ flashcardId: "card-1" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /remover dos favoritos/i }).getAttribute("aria-pressed")).toBe(
        "true",
      ),
    );
  });

  it("reverte o estado otimista e mostra erro quando o servidor falha", async () => {
    toggleFavoriteActionMock.mockResolvedValue({
      ok: false,
      error: { code: "NOT_FOUND", message: "Cartão não encontrado." },
    });
    const user = userEvent.setup();

    render(<FlashcardFavoriteToggleButton flashcardId="card-1" initialFavorite={false} />);
    await user.click(screen.getByRole("button", { name: /adicionar aos favoritos/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Cartão não encontrado."));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /adicionar aos favoritos/i }).getAttribute("aria-pressed")).toBe(
        "false",
      ),
    );
  });

  it("parte favoritado e permite desfavoritar", async () => {
    toggleFavoriteActionMock.mockResolvedValue({ ok: true, data: { flashcardId: "card-1", isFavorite: false } });
    const user = userEvent.setup();

    render(<FlashcardFavoriteToggleButton flashcardId="card-1" initialFavorite />);
    await user.click(screen.getByRole("button", { name: /remover dos favoritos/i }));

    await waitFor(() => expect(toggleFavoriteActionMock).toHaveBeenCalledWith({ flashcardId: "card-1" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /adicionar aos favoritos/i })).toBeTruthy(),
    );
  });
});
