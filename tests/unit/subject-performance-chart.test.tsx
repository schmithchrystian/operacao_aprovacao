import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubjectPerformanceChart } from "@/components/charts/subject-performance-chart";
import type { DashboardSubjectPerformance } from "@/contracts/dashboard";

const data: DashboardSubjectPerformance[] = [
  { subject: "Direito Constitucional", accuracyPercent: 78 },
  { subject: "Português", accuracyPercent: 81.4 },
];

describe("SubjectPerformanceChart", () => {
  it("expõe um resumo textual acessível com todas as matérias e percentuais", () => {
    render(<SubjectPerformanceChart data={data} />);

    const figure = screen.getByRole("img", { name: /percentual de acerto por matéria/i });
    expect(figure.getAttribute("aria-label")).toContain("Direito Constitucional: 78%");
    expect(figure.getAttribute("aria-label")).toContain("Português: 81%");

    expect(screen.getAllByRole("listitem")).toHaveLength(data.length);
  });
});
