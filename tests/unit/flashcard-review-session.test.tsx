import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FlashcardDTO, ReviewSessionDTO } from "@/contracts/flashcards";

const { refreshMock, reviewCardActionMock, toggleFavoriteActionMock, toastSuccessMock, toastErrorMock } =
  vi.hoisted(() => ({
    refreshMock: vi.fn(),
    reviewCardActionMock: vi.fn(),
    toggleFavoriteActionMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/flashcards", () => ({
  reviewCardAction: reviewCardActionMock,
  toggleFavoriteAction: toggleFavoriteActionMock,
}));

const { ReviewSession } = await import("@/components/flashcards/review-session");

function makeCard(overrides: Partial<FlashcardDTO> & Pick<FlashcardDTO, "id" | "question" | "answer">): FlashcardDTO {
  return {
    deckId: "deck-1",
    deckTitle: "Flashcards — Direito Constitucional",
    subjectId: "subject-1",
    subjectName: "Direito Constitucional",
    topicId: null,
    topicName: null,
    difficulty: "MEDIUM",
    tags: [],
    isFavorite: false,
    lastReviewedAt: null,
    nextReviewAt: null,
    intervalDays: 0,
    easeFactor: 2.5,
    repetition: 0,
    isDue: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSession(cards: FlashcardDTO[], totalDue = cards.length): ReviewSessionDTO {
  return { deckId: null, cards, totalDue };
}

describe("ReviewSession", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    reviewCardActionMock.mockReset();
    toggleFavoriteActionMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("sem cartões devidos, mostra o estado 'tudo em dia' com link de volta", () => {
    render(<ReviewSession initialSession={makeSession([])} />);

    expect(screen.getByText(/tudo em dia/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /voltar para flashcards/i })).toBeTruthy();
    expect(reviewCardActionMock).not.toHaveBeenCalled();
  });

  it("mostra a pergunta primeiro; resposta e botões de classificação só aparecem após 'Mostrar resposta'", async () => {
    const card = makeCard({ id: "card-1", question: "O que é cláusula pétrea?", answer: "Resposta da cláusula." });
    const user = userEvent.setup();

    render(<ReviewSession initialSession={makeSession([card])} />);

    expect(screen.getByText("O que é cláusula pétrea?")).toBeTruthy();
    expect(screen.queryByText("Resposta da cláusula.")).toBeNull();
    expect(screen.queryByRole("button", { name: /^errei$/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: /mostrar resposta/i }));

    expect(screen.getByText("Resposta da cláusula.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^errei$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^difícil$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^médio$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^fácil$/i })).toBeTruthy();
  });

  it("'Mostrar resposta' é acionável por teclado (foco + Enter)", async () => {
    const card = makeCard({ id: "card-1", question: "Pergunta 1", answer: "Resposta 1" });
    const user = userEvent.setup();

    render(<ReviewSession initialSession={makeSession([card])} />);

    screen.getByRole("button", { name: /mostrar resposta/i }).focus();
    await user.keyboard("{Enter}");

    expect(screen.getByText("Resposta 1")).toBeTruthy();
  });

  it("classificar envia {flashcardId, rating} e avança para o próximo cartão", async () => {
    const cardOne = makeCard({ id: "card-1", question: "Pergunta 1", answer: "Resposta 1" });
    const cardTwo = makeCard({ id: "card-2", question: "Pergunta 2", answer: "Resposta 2" });
    reviewCardActionMock.mockResolvedValue({
      ok: true,
      data: { ...cardOne, nextReviewAt: "2026-07-17T00:00:00.000Z" },
    });
    const user = userEvent.setup();

    render(<ReviewSession initialSession={makeSession([cardOne, cardTwo])} />);

    expect(screen.getByText(/cartão 1 de 2/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /mostrar resposta/i }));
    await user.click(screen.getByRole("button", { name: /^fácil$/i }));

    await waitFor(() =>
      expect(reviewCardActionMock).toHaveBeenCalledWith({ flashcardId: "card-1", rating: "EASY" }),
    );
    expect(await screen.findByText("Pergunta 2")).toBeTruthy();
    // Duas ocorrências por design: o rótulo de progresso visível (`<p>`) e o anúncio `aria-live`
    // (`sr-only`, verificado à parte abaixo) — restringe ao `<p>` visível para desambiguar.
    expect(screen.getByText(/cartão 2 de 2/i, { selector: "p" })).toBeTruthy();
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(screen.getByTestId("flashcards-announcement").textContent).toMatch(/cartão 2 de 2/i);
  });

  it("ao concluir todos os cartões, mostra o resumo com a contagem por classificação", async () => {
    const cardOne = makeCard({ id: "card-1", question: "Pergunta 1", answer: "Resposta 1" });
    const cardTwo = makeCard({ id: "card-2", question: "Pergunta 2", answer: "Resposta 2" });
    reviewCardActionMock.mockResolvedValueOnce({ ok: true, data: cardOne });
    reviewCardActionMock.mockResolvedValueOnce({ ok: true, data: cardTwo });
    const user = userEvent.setup();

    render(<ReviewSession initialSession={makeSession([cardOne, cardTwo])} />);

    await user.click(screen.getByRole("button", { name: /mostrar resposta/i }));
    await user.click(screen.getByRole("button", { name: /^fácil$/i }));
    await screen.findByText("Pergunta 2");
    await user.click(screen.getByRole("button", { name: /mostrar resposta/i }));
    await user.click(screen.getByRole("button", { name: /^errei$/i }));

    expect(await screen.findByText(/sessão concluída/i)).toBeTruthy();
    expect(screen.getByText(/você revisou 2 cartões agora/i)).toBeTruthy();
    expect(screen.getByTestId("flashcards-announcement").textContent).toMatch(/sessão de revisão concluída/i);
  });

  it("CONFLICT (revisado em outra aba): mostra mensagem clara e pula o cartão sem contabilizar", async () => {
    const cardOne = makeCard({ id: "card-1", question: "Pergunta 1", answer: "Resposta 1" });
    const cardTwo = makeCard({ id: "card-2", question: "Pergunta 2", answer: "Resposta 2" });
    reviewCardActionMock.mockResolvedValueOnce({
      ok: false,
      error: { code: "CONFLICT", message: "Este cartão ainda não está disponível para revisão." },
    });
    const user = userEvent.setup();

    render(<ReviewSession initialSession={makeSession([cardOne, cardTwo])} />);

    await user.click(screen.getByRole("button", { name: /mostrar resposta/i }));
    await user.click(screen.getByRole("button", { name: /^fácil$/i }));

    expect(await screen.findByText("Pergunta 2")).toBeTruthy();
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringMatching(/não está mais disponível/i));

    // Avança a UI (pula o cartão), mas não contabiliza a revisão que não foi de fato aceita: a
    // segunda (e última) classificação bem-sucedida deve aparecer como a ÚNICA no resumo.
    await user.click(screen.getByRole("button", { name: /mostrar resposta/i }));
    reviewCardActionMock.mockResolvedValueOnce({ ok: true, data: cardTwo });
    await user.click(screen.getByRole("button", { name: /^médio$/i }));

    expect(await screen.findByText(/sessão concluída/i)).toBeTruthy();
    expect(screen.getByText(/você revisou 1 cartão agora/i)).toBeTruthy();
  });

  it("erro genérico (não CONFLICT): mostra erro e mantém o cartão atual para nova tentativa", async () => {
    const card = makeCard({ id: "card-1", question: "Pergunta 1", answer: "Resposta 1" });
    reviewCardActionMock.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Não foi possível processar a solicitação." },
    });
    const user = userEvent.setup();

    render(<ReviewSession initialSession={makeSession([card])} />);

    await user.click(screen.getByRole("button", { name: /mostrar resposta/i }));
    await user.click(screen.getByRole("button", { name: /^difícil$/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Não foi possível processar a solicitação."));
    // Permanece no mesmo cartão (não avançou) — a pergunta/resposta e os botões continuam visíveis.
    expect(screen.getByText("Pergunta 1")).toBeTruthy();
    expect(screen.getByText(/cartão 1 de 1/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^difícil$/i })).toBeTruthy();
  });

  it("sessão limitada (totalDue > cards.length): oferece 'Carregar mais' após concluir o lote", async () => {
    const card = makeCard({ id: "card-1", question: "Pergunta 1", answer: "Resposta 1" });
    reviewCardActionMock.mockResolvedValue({ ok: true, data: card });
    const user = userEvent.setup();

    render(<ReviewSession initialSession={makeSession([card], 5)} />);

    expect(screen.getByText(/revisando 1 de 5 devidos agora/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /mostrar resposta/i }));
    await user.click(screen.getByRole("button", { name: /^fácil$/i }));

    const loadMoreButton = await screen.findByRole("button", { name: /carregar mais/i });
    expect(screen.getByText(/ainda há 4 cartões devidos/i)).toBeTruthy();

    await user.click(loadMoreButton);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
