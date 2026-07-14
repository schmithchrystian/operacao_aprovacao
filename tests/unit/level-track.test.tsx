import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LevelTrack } from "@/components/achievements/level-track";
import { LEVELS } from "@/server/services/gamification/levels";

describe("LevelTrack", () => {
  it("renderiza os 7 níveis com o XP mínimo de cada um", () => {
    render(<LevelTrack levels={LEVELS} currentLevelIndex={3} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByText("Recruta")).toBeTruthy();
    expect(screen.getByText("Comandante")).toBeTruthy();
    expect(screen.getByText("15.000 XP")).toBeTruthy();
  });

  it("marca o nível atual, os alcançados e os bloqueados com rótulo textual (não só cor)", () => {
    render(<LevelTrack levels={LEVELS} currentLevelIndex={3} />);

    expect(screen.getAllByText("Alcançado")).toHaveLength(2); // Recruta, Aspirante
    expect(screen.getAllByText("Nível atual")).toHaveLength(1); // Combatente
    expect(screen.getAllByText("Bloqueado")).toHaveLength(4); // Especialista..Comandante
  });
});
