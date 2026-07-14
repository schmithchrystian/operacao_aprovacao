import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccuracyBreakdownChart } from "@/components/charts/accuracy-breakdown-chart";
import type { TrackingQuestionsSummaryDTO } from "@/contracts/tracking";

const data: TrackingQuestionsSummaryDTO = {
  totalAnswered: 80,
  totalCorrect: 60,
  accuracyPercent: 75,
  averageSecondsPerQuestion: 42,
};

/**
 * Recharts depende de medição real do DOM, ausente em jsdom — por isso o SVG interno não é o
 * alvo do teste. O contrato que importa é o resumo textual acessível (`role="img"`/`aria-label`
 * + lista `sr-only`) — inclusive a subtração `totalAnswered - totalCorrect` (erros), a única
 * conta feita pelo componente.
 */
describe("AccuracyBreakdownChart", () => {
  it("calcula os erros como totalAnswered - totalCorrect e expõe o resumo acessível", () => {
    render(<AccuracyBreakdownChart data={data} />);

    const figure = screen.getByRole("img", { name: /acertos e erros nas questões respondidas/i });
    expect(figure.getAttribute("aria-label")).toContain("Acertos: 60");
    expect(figure.getAttribute("aria-label")).toContain("Erros: 20");
    expect(figure.getAttribute("aria-label")).toContain("de 80 questões respondidas");
    expect(figure.getAttribute("aria-label")).toContain("75% de aproveitamento");

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("nunca calcula um número de erros negativo, mesmo com dados inconsistentes", () => {
    render(<AccuracyBreakdownChart data={{ ...data, totalAnswered: 0, totalCorrect: 5 }} />);

    expect(screen.getByText(/Erros: 0/)).toBeTruthy();
  });
});
