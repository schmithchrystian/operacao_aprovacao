import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GamificationPanel } from "@/components/dashboard/gamification-panel";
import type { DashboardGamification } from "@/contracts/dashboard";

const baseGamification: DashboardGamification = {
  level: { index: 2, name: "Aspirante" },
  points: 4230,
  xp: 1380,
  currentLevelXp: 1000,
  nextLevelXp: 2500,
  streakDays: 6,
};

describe("GamificationPanel", () => {
  it("mostra a barra de progresso até o próximo nível quando nextLevelXp existir", () => {
    render(<GamificationPanel gamification={baseGamification} />);

    expect(screen.getByText("Nível 2 — Aspirante")).toBeTruthy();
    expect(screen.getByText(/faltam 1\.120 xp para o próximo nível/i)).toBeTruthy();
  });

  it("mostra o estado de nível máximo quando nextLevelXp for null (Comandante)", () => {
    render(
      <GamificationPanel
        gamification={{
          ...baseGamification,
          level: { index: 7, name: "Comandante" },
          nextLevelXp: null,
        }}
      />,
    );

    expect(screen.getByText(/nível máximo atingido/i)).toBeTruthy();
  });
});
