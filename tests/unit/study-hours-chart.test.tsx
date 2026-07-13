import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StudyHoursChart } from "@/components/charts/study-hours-chart";
import type { DashboardStudyHoursPoint } from "@/contracts/dashboard";

const data: DashboardStudyHoursPoint[] = [
  { weekday: "seg", minutes: 90 },
  { weekday: "ter", minutes: 0 },
  { weekday: "qua", minutes: 75 },
  { weekday: "qui", minutes: 45 },
  { weekday: "sex", minutes: 100 },
  { weekday: "sab", minutes: 130 },
  { weekday: "dom", minutes: 120 },
];

/**
 * Recharts depende de medição real do DOM (ResizeObserver/getBoundingClientRect), que
 * não existe em jsdom — por isso o SVG interno não é o alvo do teste. O contrato que
 * importa (CLAUDE.md — acessibilidade) é o resumo textual: `role="img"` com `aria-label`
 * e a lista `sr-only` como alternativa para leitores de tela.
 */
describe("StudyHoursChart", () => {
  it("expõe um resumo textual acessível com todos os dias e durações", () => {
    render(<StudyHoursChart data={data} />);

    const figure = screen.getByRole("img", { name: /horas estudadas por dia da semana/i });
    expect(figure.getAttribute("aria-label")).toContain("Seg: 1h 30min");
    expect(figure.getAttribute("aria-label")).toContain("Ter: 0min");

    expect(screen.getAllByRole("listitem")).toHaveLength(data.length);
  });
});
