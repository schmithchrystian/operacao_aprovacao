import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiagnosisPanel } from "@/components/tracking/diagnosis-panel";
import type { DiagnosisDTO } from "@/contracts/tracking";

const baseDiagnosis: DiagnosisDTO = {
  strengths: ["Bom desempenho em Português (85% de acerto)."],
  weaknesses: ["Direito Penal: 40% de acerto (abaixo de 60%)."],
  priorities: ["Reforçar Direito Penal (40% de acerto)."],
  delayRisk: "MEDIUM",
  delayRiskReason: "Progresso do plano levemente abaixo do esperado para a proximidade da prova.",
  suggestions: ["Reserve um horário fixo na próxima semana para reduzir o atraso do plano."],
};

describe("DiagnosisPanel", () => {
  it("mostra o badge de risco com texto (nunca só cor) e o motivo explicado pelo backend", () => {
    render(<DiagnosisPanel diagnosis={baseDiagnosis} />);

    expect(screen.getByText("Risco médio")).toBeTruthy();
    expect(screen.getByText(baseDiagnosis.delayRiskReason)).toBeTruthy();
  });

  it("mostra os labels LOW/HIGH corretamente", () => {
    const { rerender } = render(<DiagnosisPanel diagnosis={{ ...baseDiagnosis, delayRisk: "LOW" }} />);
    expect(screen.getByText("Risco baixo")).toBeTruthy();

    rerender(<DiagnosisPanel diagnosis={{ ...baseDiagnosis, delayRisk: "HIGH" }} />);
    expect(screen.getByText("Risco alto")).toBeTruthy();
  });

  it("lista pontos fortes, pontos fracos, prioridades (numeradas) e sugestões", () => {
    render(<DiagnosisPanel diagnosis={baseDiagnosis} />);

    expect(screen.getByText(baseDiagnosis.strengths[0]!)).toBeTruthy();
    expect(screen.getByText(baseDiagnosis.weaknesses[0]!)).toBeTruthy();
    expect(screen.getByText(baseDiagnosis.suggestions[0]!)).toBeTruthy();

    const priorityItem = screen.getByText(baseDiagnosis.priorities[0]!);
    expect(priorityItem.closest("ol")).not.toBeNull();
  });
});
