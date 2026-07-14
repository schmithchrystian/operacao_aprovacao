import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttemptTerminalState } from "@/components/simulations/attempt-terminal-state";
import type { AttemptStatusDTO } from "@/contracts/simulations";

/**
 * Estado terminal de tentativa (Fase 10 — correção de segurança MÉDIO: loop de redirect).
 * Renderizado para tentativas EXPIRED/CANCELLED em vez de redirecionar entre resolução e
 * resultado. Prova que a tela terminal mostra um resumo não sensível (sem gabarito) e leva o
 * aluno a montar um novo simulado / ver o histórico — nunca de volta às telas que redirecionam.
 */
function statusDTO(overrides: Partial<AttemptStatusDTO> = {}): AttemptStatusDTO {
  return {
    attemptId: "attempt-1",
    mockExamId: "mock-exam-1",
    mockExamTitle: "Simulado — Direito Penal",
    status: "EXPIRED",
    startedAt: "2026-07-13T10:00:00.000Z",
    finishedAt: "2026-07-13T10:31:00.000Z",
    totalQuestions: 5,
    ...overrides,
  };
}

describe("AttemptTerminalState", () => {
  it("estado EXPIRED: mostra 'Tempo esgotado' e leva a montar novo simulado / histórico (sem redirect)", () => {
    render(<AttemptTerminalState attempt={statusDTO({ status: "EXPIRED" })} />);

    expect(screen.getByText(/tempo esgotado/i)).toBeTruthy();

    const novo = screen.getByRole("link", { name: /montar novo simulado/i });
    expect(novo.getAttribute("href")).toBe("/simulados");

    const historico = screen.getByRole("link", { name: /ver histórico/i });
    expect(historico.getAttribute("href")).toBe("/simulados/historico");
  });

  it("estado CANCELLED: mostra 'Tentativa cancelada'", () => {
    render(<AttemptTerminalState attempt={statusDTO({ status: "CANCELLED" })} />);
    expect(screen.getByText(/tentativa cancelada/i)).toBeTruthy();
  });

  it("resumo não sensível: título e nº de questões, nunca gabarito", () => {
    render(<AttemptTerminalState attempt={statusDTO({ status: "EXPIRED" })} />);

    expect(document.body.textContent).toContain("Simulado — Direito Penal");
    expect(document.body.textContent).toContain("5 questões");
    // Estado terminal nunca corrigiu a tentativa: nenhum vestígio de gabarito.
    expect(document.body.innerHTML).not.toContain("isCorrect");
    expect(document.body.textContent).not.toContain("Gabarito");
  });
});
