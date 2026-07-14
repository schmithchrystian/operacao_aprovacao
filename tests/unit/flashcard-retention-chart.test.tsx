import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlashcardRetentionChart } from "@/components/charts/flashcard-retention-chart";
import type { RetentionStatsDTO } from "@/contracts/flashcards";

const data: RetentionStatsDTO = {
  totalCards: 20,
  cardsReviewedAtLeastOnce: 12,
  totalReviews: 40,
  correctReviews: 30,
  retentionPercent: 75,
  dueNowCount: 5,
};

/**
 * Recharts depende de medição real do DOM, ausente em jsdom — por isso o SVG interno não é o
 * alvo do teste. O contrato que importa é o resumo textual acessível (`role="img"`/`aria-label`
 * + lista `sr-only`) — inclusive a subtração `totalReviews - correctReviews` (erros), a única
 * conta feita pelo componente (mesmo padrão de `accuracy-breakdown-chart.test.tsx`).
 */
describe("FlashcardRetentionChart", () => {
  it("calcula os erros como totalReviews - correctReviews e expõe o resumo acessível", () => {
    render(<FlashcardRetentionChart data={data} />);

    const figure = screen.getByRole("img", { name: /retenção nas revisões de flashcards/i });
    expect(figure.getAttribute("aria-label")).toContain("Acertos: 30");
    expect(figure.getAttribute("aria-label")).toContain("Erros: 10");
    expect(figure.getAttribute("aria-label")).toContain("de 40 revisões");
    expect(figure.getAttribute("aria-label")).toContain("75% de retenção");

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("nunca calcula um número de erros negativo, mesmo com dados inconsistentes", () => {
    render(<FlashcardRetentionChart data={{ ...data, totalReviews: 0, correctReviews: 5 }} />);

    expect(screen.getByText(/Erros: 0/)).toBeTruthy();
  });
});
