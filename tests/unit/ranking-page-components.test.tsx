import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { RankingPodium } from "@/components/ranking/ranking-podium";
import { RankingResults } from "@/components/ranking/ranking-results";
import { RankingEvolution } from "@/components/ranking/ranking-evolution";
import { RankingPagination } from "@/components/ranking/ranking-pagination";
import { RankingCurrentUserBar } from "@/components/ranking/ranking-current-user-bar";
import type { ParsedRankingQuery } from "@/components/ranking/ranking-query";
import type { RankingListEntryDTO } from "@/server/services/gamification";

/**
 * Testes de UI da Fase 9 (`frontend`) para os componentes de `/ranking`. Cobrem apenas
 * apresentação (posição, avatar/iniciais, nível, pontos, evolução, paginação e a linha do
 * usuário atual) a partir de um `RankingListEntryDTO` já pronto — sem recalcular nada.
 */

function buildEntry(overrides: Partial<RankingListEntryDTO>): RankingListEntryDTO {
  return {
    position: 1,
    userId: "user-1",
    displayName: "Ana Recruta",
    avatarUrl: null,
    city: "São Paulo",
    state: "SP",
    level: { index: 2, name: "Aspirante" },
    contestName: "Polícia Militar — Soldado",
    points: 4230,
    validHours: 12.5,
    lessonsCompleted: 18,
    accuracyPercent: 82.4,
    streakDays: 5,
    evolution: 0,
    isCurrentUser: false,
    ...overrides,
  };
}

const baseQuery: ParsedRankingQuery = { period: "geral", scope: "global", scopeKey: "global", page: 1 };

describe("RankingPodium", () => {
  it("mostra os 3 primeiros colocados com nível e pontos", () => {
    const entries = [
      buildEntry({ position: 1, userId: "u1", displayName: "Primeiro Lugar", points: 9000 }),
      buildEntry({ position: 2, userId: "u2", displayName: "Segundo Lugar", points: 8000 }),
      buildEntry({ position: 3, userId: "u3", displayName: "Terceiro Lugar", points: 7000 }),
    ];

    render(<RankingPodium entries={entries} />);

    expect(screen.getByText("Primeiro Lugar")).toBeTruthy();
    expect(screen.getByText("Segundo Lugar")).toBeTruthy();
    expect(screen.getByText("Terceiro Lugar")).toBeTruthy();
    expect(screen.getByText("9.000")).toBeTruthy();
  });

  it("não quebra com menos de 3 participantes", () => {
    render(<RankingPodium entries={[buildEntry({ position: 1, displayName: "Único" })]} />);
    expect(screen.getByText("Único")).toBeTruthy();
  });

  it("retorna null (sem pódio) quando não há participantes", () => {
    const { container } = render(<RankingPodium entries={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("RankingResults", () => {
  it("mostra posição, nível, concurso, métricas e o marcador 'Você' na linha do usuário atual", () => {
    const items = [
      buildEntry({ position: 4, userId: "u4", displayName: "Outro Aluno", isCurrentUser: false, evolution: 2 }),
      buildEntry({ position: 5, userId: "u5", displayName: "Usuário Atual", isCurrentUser: true, evolution: -1 }),
    ];

    render(<RankingResults items={items} />);

    expect(screen.getAllByText("Outro Aluno").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Usuário Atual").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Você").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nível 2 — Aspirante").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Polícia Militar — Soldado").length).toBeGreaterThan(0);
  });

  it("mostra cidade mascarada (null) como travessão", () => {
    const items = [buildEntry({ position: 1, contestName: null })];
    render(<RankingResults items={items} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});

describe("RankingEvolution", () => {
  it("descreve subida, queda e estabilidade tanto por texto curto quanto por leitor de tela", () => {
    const { rerender } = render(<RankingEvolution value={3} />);
    expect(screen.getByText("+3")).toBeTruthy();
    expect(screen.getByText(/subiu 3 posições/i)).toBeTruthy();

    rerender(<RankingEvolution value={-2} />);
    expect(screen.getByText("-2")).toBeTruthy();
    expect(screen.getByText(/caiu 2 posições/i)).toBeTruthy();

    rerender(<RankingEvolution value={0} />);
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText(/sem alteração de posição/i)).toBeTruthy();
  });
});

describe("RankingPagination", () => {
  it("desabilita 'Anterior' na primeira página e habilita 'Próxima' quando há mais páginas", () => {
    render(<RankingPagination query={baseQuery} page={1} pageSize={20} total={45} />);

    expect(screen.getByText(/página 1 de 3/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /anterior/i })).toHaveProperty("disabled", true);
    expect(screen.getByRole("link", { name: /próxima/i })).toBeTruthy();
  });

  it("desabilita 'Próxima' na última página", () => {
    render(<RankingPagination query={{ ...baseQuery, page: 3 }} page={3} pageSize={20} total={45} />);
    expect(screen.getByRole("button", { name: /próxima/i })).toHaveProperty("disabled", true);
    expect(screen.getByRole("link", { name: /anterior/i })).toBeTruthy();
  });
});

describe("RankingCurrentUserBar", () => {
  it("mostra a posição real do usuário e um link para a página onde ela está, quando fora da página atual", () => {
    const entry = buildEntry({ position: 47, displayName: "Ana Recruta", isCurrentUser: true, evolution: 1 });
    render(<RankingCurrentUserBar entry={entry} query={baseQuery} currentPage={1} pageSize={20} />);

    const bar = screen.getByRole("status", { name: /sua posição no ranking/i });
    expect(within(bar).getByText("47º")).toBeTruthy();
    expect(within(bar).getByText("Ana Recruta")).toBeTruthy();
    const link = within(bar).getByRole("link", { name: /ver minha posição/i });
    expect(link.getAttribute("href")).toBe("/ranking?pagina=3");
  });

  it("não mostra o link quando o usuário já está na página atual", () => {
    const entry = buildEntry({ position: 5, isCurrentUser: true });
    render(<RankingCurrentUserBar entry={entry} query={baseQuery} currentPage={1} pageSize={20} />);
    expect(screen.queryByRole("link", { name: /ver minha posição/i })).toBeNull();
  });
});
