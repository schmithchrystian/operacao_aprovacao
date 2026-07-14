import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AchievementGrid } from "@/components/achievements/achievement-grid";
import type { UserAchievementView } from "@/server/services/gamification/read";

const achievements: UserAchievementView[] = [
  {
    key: "first-victory",
    name: "Primeira vitória",
    description: "Concluiu a primeira aula.",
    icon: "Star",
    unlocked: true,
    unlockedAt: "2026-07-01T10:00:00.000Z",
  },
  {
    key: "lessons-100",
    name: "100 aulas concluídas",
    description: "Concluiu 100 aulas.",
    icon: "BookOpenCheck",
    unlocked: false,
    unlockedAt: null,
  },
];

describe("AchievementGrid", () => {
  it("separa conquistas desbloqueadas e bloqueadas, mostrando data e critério", () => {
    render(<AchievementGrid achievements={achievements} />);

    expect(screen.getByText("1 de 2 desbloqueadas")).toBeTruthy();
    expect(screen.getByText("Primeira vitória")).toBeTruthy();
    expect(screen.getByText(/desbloqueada em/i)).toBeTruthy();
    expect(screen.getByText("100 aulas concluídas")).toBeTruthy();
    expect(screen.getByText("Concluiu 100 aulas.")).toBeTruthy();
    expect(screen.getAllByText("Desbloqueada")).toHaveLength(1);
    expect(screen.getAllByText("Bloqueada")).toHaveLength(1);
  });

  it("mostra estado vazio quando não há conquistas cadastradas", () => {
    render(<AchievementGrid achievements={[]} />);

    expect(screen.getByText("Nenhuma conquista disponível")).toBeTruthy();
  });
});
