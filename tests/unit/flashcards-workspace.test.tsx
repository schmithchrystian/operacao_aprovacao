import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DeckDTO, RetentionStatsDTO } from "@/contracts/flashcards";

const {
  createDeckActionMock,
  createCardActionMock,
  createFromErrorsActionMock,
  createFromNotesActionMock,
  listDecksActionMock,
  getRetentionStatsActionMock,
  listTopicOptionsActionMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  createDeckActionMock: vi.fn(),
  createCardActionMock: vi.fn(),
  createFromErrorsActionMock: vi.fn(),
  createFromNotesActionMock: vi.fn(),
  listDecksActionMock: vi.fn(),
  getRetentionStatsActionMock: vi.fn(),
  listTopicOptionsActionMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/flashcards", () => ({
  createDeckAction: createDeckActionMock,
  createCardAction: createCardActionMock,
  createFromErrorsAction: createFromErrorsActionMock,
  createFromNotesAction: createFromNotesActionMock,
  listDecksAction: listDecksActionMock,
  getRetentionStatsAction: getRetentionStatsActionMock,
}));

vi.mock("@/server/actions/simulations", () => ({
  listTopicOptionsAction: listTopicOptionsActionMock,
}));

const { FlashcardsWorkspace } = await import("@/components/flashcards/flashcards-workspace");

function makeDeck(overrides: Partial<DeckDTO> & Pick<DeckDTO, "id" | "title" | "type">): DeckDTO {
  return {
    subjectId: null,
    subjectName: null,
    cardCount: 0,
    dueCount: 0,
    ...overrides,
  };
}

const retention: RetentionStatsDTO = {
  totalCards: 10,
  cardsReviewedAtLeastOnce: 4,
  totalReviews: 8,
  correctReviews: 6,
  retentionPercent: 75,
  dueNowCount: 2,
};

describe("FlashcardsWorkspace", () => {
  beforeEach(() => {
    createDeckActionMock.mockReset();
    createCardActionMock.mockReset();
    createFromErrorsActionMock.mockReset();
    createFromNotesActionMock.mockReset();
    listDecksActionMock.mockReset();
    getRetentionStatsActionMock.mockReset();
    listTopicOptionsActionMock.mockReset();
    listTopicOptionsActionMock.mockResolvedValue({ ok: true, data: [] });
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("agrupa os baralhos por tipo e exibe contagem/devidos", () => {
    const decks = [
      makeDeck({ id: "virtual-favorites", title: "Favoritos", type: "FAVORITES" }),
      makeDeck({ id: "deck-portugues", title: "Flashcards — Português", type: "SUBJECT", cardCount: 3, dueCount: 1 }),
    ];

    render(<FlashcardsWorkspace initialDecks={decks} initialRetention={retention} subjects={[]} />);

    expect(screen.getByText("Matérias")).toBeTruthy();
    // "Favoritos" aparece duas vezes por design: o título da seção e o título do baralho
    // virtual sintetizado dentro dela (`@/server/services/flashcards/list-decks.ts`).
    expect(screen.getByRole("heading", { name: "Favoritos", level: 3 })).toBeTruthy();
    expect(screen.getAllByText("Favoritos")).toHaveLength(2);
    expect(screen.getByText("Flashcards — Português")).toBeTruthy();
    expect(screen.getByText("3 cartões")).toBeTruthy();
    expect(screen.getByText("1 p/ revisar")).toBeTruthy();
    // Sem baralho pessoal ainda -> sem seção "Personalizados".
    expect(screen.queryByText("Personalizados")).toBeNull();
  });

  it("sem baralho pessoal, oferece dica em vez do botão 'Criar cartão'", () => {
    const decks = [makeDeck({ id: "virtual-favorites", title: "Favoritos", type: "FAVORITES" })];

    render(<FlashcardsWorkspace initialDecks={decks} initialRetention={retention} subjects={[]} />);

    expect(screen.queryByRole("button", { name: /criar cartão/i })).toBeNull();
    expect(screen.getByText(/crie um baralho para poder adicionar cartões/i)).toBeTruthy();
  });

  it("criar baralho: chama createDeckAction e atualiza a lista via refetch", async () => {
    const decks = [makeDeck({ id: "virtual-favorites", title: "Favoritos", type: "FAVORITES" })];
    const createdDeck = makeDeck({ id: "deck-novo", title: "Revisão final", type: "PERSONAL" });
    createDeckActionMock.mockResolvedValue({ ok: true, data: createdDeck });
    listDecksActionMock.mockResolvedValue({ ok: true, data: [...decks, createdDeck] });
    getRetentionStatsActionMock.mockResolvedValue({ ok: true, data: retention });
    const user = userEvent.setup();

    render(<FlashcardsWorkspace initialDecks={decks} initialRetention={retention} subjects={[]} />);

    await user.click(screen.getByRole("button", { name: /criar baralho/i }));
    await user.type(screen.getByLabelText(/título do baralho/i), "Revisão final");
    await user.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() =>
      expect(createDeckActionMock).toHaveBeenCalledWith({ title: "Revisão final", subjectId: undefined }),
    );
    await waitFor(() => expect(listDecksActionMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Revisão final")).toBeTruthy();
    // Agora que existe um baralho pessoal, o botão "Criar cartão" passa a existir.
    expect(screen.getByRole("button", { name: /criar cartão/i })).toBeTruthy();
  });

  it("gerar de erros: chama createFromErrorsAction e atualiza baralhos/retenção via refetch", async () => {
    const decks = [makeDeck({ id: "virtual-favorites", title: "Favoritos", type: "FAVORITES" })];
    createFromErrorsActionMock.mockResolvedValue({ ok: true, data: [{ id: "card-1" }] });
    const updatedDecks = [
      ...decks,
      makeDeck({ id: "deck-erros", title: "Criados do caderno de erros", type: "ERRORS", cardCount: 1 }),
    ];
    listDecksActionMock.mockResolvedValue({ ok: true, data: updatedDecks });
    getRetentionStatsActionMock.mockResolvedValue({ ok: true, data: retention });
    const user = userEvent.setup();

    render(<FlashcardsWorkspace initialDecks={decks} initialRetention={retention} subjects={[]} />);

    await user.click(screen.getByRole("button", { name: /gerar de erros/i }));

    await waitFor(() => expect(createFromErrorsActionMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listDecksActionMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Criados do caderno de erros")).toBeTruthy();
  });

  it("falha ao gerar de anotações: mostra erro e não altera os baralhos", async () => {
    const decks = [makeDeck({ id: "virtual-favorites", title: "Favoritos", type: "FAVORITES" })];
    createFromNotesActionMock.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Não foi possível processar a solicitação." },
    });
    const user = userEvent.setup();

    render(<FlashcardsWorkspace initialDecks={decks} initialRetention={retention} subjects={[]} />);

    await user.click(screen.getByRole("button", { name: /gerar de anotações/i }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith("Não foi possível processar a solicitação."),
    );
    expect(listDecksActionMock).not.toHaveBeenCalled();
  });

  it("sem estatísticas de retenção (falha ao carregar), mostra aviso em vez do painel", () => {
    const decks = [makeDeck({ id: "virtual-favorites", title: "Favoritos", type: "FAVORITES" })];

    render(<FlashcardsWorkspace initialDecks={decks} initialRetention={null} subjects={[]} />);

    expect(screen.getByText(/não foi possível carregar as estatísticas de retenção/i)).toBeTruthy();
  });
});
