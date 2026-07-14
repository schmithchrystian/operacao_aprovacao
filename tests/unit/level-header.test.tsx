import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LevelHeader } from "@/components/achievements/level-header";
import type { ComputedLevel } from "@/server/services/gamification/levels";

const aspiranteLevel: ComputedLevel = {
  level: {
    index: 2,
    key: "aspirante",
    name: "Aspirante",
    minXp: 1000,
    icon: "ShieldHalf",
    benefit: "Primeiros resultados começam a aparecer.",
  },
  currentLevelXp: 1000,
  nextLevelXp: 2500,
  progressPercent: 25.3,
  xpToNextLevel: 1120,
};

const comandanteLevel: ComputedLevel = {
  level: {
    index: 7,
    key: "comandante",
    name: "Comandante",
    minXp: 15000,
    icon: "Crown",
    benefit: "Nível máximo — referência de disciplina e constância.",
  },
  currentLevelXp: 15000,
  nextLevelXp: null,
  progressPercent: 100,
  xpToNextLevel: null,
};

describe("LevelHeader", () => {
  it("mostra nível, benefício, XP, pontos e progresso até o próximo nível", () => {
    render(<LevelHeader computedLevel={aspiranteLevel} points={4230} xp={1380} />);

    expect(screen.getByText("Nível 2 — Aspirante")).toBeTruthy();
    expect(screen.getByText("Primeiros resultados começam a aparecer.")).toBeTruthy();
    expect(screen.getByText("4.230 pontos")).toBeTruthy();
    expect(screen.getByText(/faltam 1\.120 xp para o próximo nível/i)).toBeTruthy();
  });

  it("mostra o aviso de nível máximo quando nextLevelXp for null (Comandante)", () => {
    render(<LevelHeader computedLevel={comandanteLevel} points={20000} xp={16000} />);

    expect(screen.getByText(/nível máximo atingido/i)).toBeTruthy();
  });
});
