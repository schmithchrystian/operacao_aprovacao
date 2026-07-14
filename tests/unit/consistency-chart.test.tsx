import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConsistencyChart } from "@/components/charts/consistency-chart";
import type { TrackingConsistencyDTO } from "@/contracts/tracking";

const data: TrackingConsistencyDTO = { windowDays: 30, activeDays: 21, consistencyPercent: 70 };

describe("ConsistencyChart", () => {
  it("expõe um resumo textual acessível com o percentual e a janela de dias", () => {
    render(<ConsistencyChart data={data} />);

    const figure = screen.getByRole("img", { name: /consistência de estudo/i });
    expect(figure.getAttribute("aria-label")).toContain("70% de constância nos últimos 30 dias");
    expect(figure.getAttribute("aria-label")).toContain("21 de 30 dias com estudo");
  });
});
