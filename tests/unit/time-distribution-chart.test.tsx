import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimeDistributionChart } from "@/components/charts/time-distribution-chart";
import type { TrackingTimeDistributionEntryDTO } from "@/contracts/tracking";

const data: TrackingTimeDistributionEntryDTO[] = [
  { subjectId: "subj-1", subjectName: "Direito Constitucional", minutes: 300 },
  { subjectId: "subj-2", subjectName: "Português", minutes: 100 },
];

/**
 * Recharts depende de medição real do DOM, ausente em jsdom — por isso o SVG interno não é o
 * alvo do teste. O contrato que importa é o resumo textual (`role="img"`/`aria-label`) e a
 * legenda visível (mapeamento cor -> matéria, útil além de leitores de tela num gráfico de pizza).
 */
describe("TimeDistributionChart", () => {
  it("expõe um resumo textual acessível com matéria, duração e percentual", () => {
    render(<TimeDistributionChart data={data} />);

    const figure = screen.getByRole("img", { name: /distribuição do tempo de estudo por matéria/i });
    expect(figure.getAttribute("aria-label")).toContain("Direito Constitucional: 5h (75%)");
    expect(figure.getAttribute("aria-label")).toContain("Português: 1h 40min (25%)");
  });

  it("renderiza uma legenda visível com uma entrada por matéria", () => {
    render(<TimeDistributionChart data={data} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(data.length);
    expect(screen.getByText(/Direito Constitucional: 5h/)).toBeTruthy();
    expect(screen.getByText(/Português: 1h 40min/)).toBeTruthy();
  });
});
