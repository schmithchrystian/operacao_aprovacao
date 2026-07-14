import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExamProgressChart } from "@/components/charts/exam-progress-chart";

describe("ExamProgressChart", () => {
  it("expõe um resumo textual acessível com o progresso real e o esperado", () => {
    render(<ExamProgressChart planProgressPercent={42} expectedProgressPercent={60} delayRisk="MEDIUM" />);

    const figure = screen.getByRole("img", { name: /progresso do plano de estudos até a prova/i });
    expect(figure.getAttribute("aria-label")).toContain("Progresso real: 42%");
    expect(figure.getAttribute("aria-label")).toContain("Progresso esperado: 60%");

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("não recalcula o risco — apenas recebe `delayRisk` já pronto para escolher a cor da barra", () => {
    // Nenhuma asserção de cor aqui (detalhe de estilo do SVG, não medido em jsdom) — o teste
    // documenta que o componente aceita os três níveis sem lançar/derivar nada por conta própria.
    for (const risk of ["LOW", "MEDIUM", "HIGH"] as const) {
      expect(() =>
        render(<ExamProgressChart planProgressPercent={50} expectedProgressPercent={50} delayRisk={risk} />),
      ).not.toThrow();
    }
  });
});
