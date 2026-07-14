import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvolutionChart, type EvolutionChartPoint } from "@/components/charts/evolution-chart";

const data: EvolutionChartPoint[] = [
  { id: "2026-06-15", label: "15/06", minutes: 0 },
  { id: "2026-06-22", label: "22/06", minutes: 120 },
  { id: "2026-06-29", label: "29/06", minutes: 90 },
];

/**
 * Recharts depende de medição real do DOM (ResizeObserver/getBoundingClientRect), ausente em
 * jsdom — por isso o SVG interno não é o alvo do teste. O contrato que importa (CLAUDE.md —
 * acessibilidade) é o resumo textual: `role="img"` com `aria-label` e a lista `sr-only`.
 */
describe("EvolutionChart", () => {
  it("expõe um resumo textual acessível com todos os pontos e durações, usando o período informado", () => {
    render(<EvolutionChart data={data} periodLabel="semana" />);

    const figure = screen.getByRole("img", { name: /evolução de horas estudadas por semana/i });
    expect(figure.getAttribute("aria-label")).toContain("15/06: 0min");
    expect(figure.getAttribute("aria-label")).toContain("22/06: 2h");

    expect(screen.getAllByRole("listitem")).toHaveLength(data.length);
  });

  it("usa o rótulo de período informado (ex.: mês) no resumo textual", () => {
    render(<EvolutionChart data={data} periodLabel="mês" />);

    expect(screen.getByRole("img", { name: /evolução de horas estudadas por mês/i })).toBeTruthy();
  });
});
