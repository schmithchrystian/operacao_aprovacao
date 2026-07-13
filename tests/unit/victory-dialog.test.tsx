import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VictoryDialog } from "@/components/lessons/victory-dialog";
import type { LessonCompletionDTO } from "@/contracts/progress";

const completion: LessonCompletionDTO = {
  lessonId: "lesson-1",
  lessonTitle: "Interpretação de texto",
  points: 100,
  xp: 100,
  moduleProgressPercent: 40,
  courseProgressPercent: 12,
  achievementUnlocked: null,
};

describe("VictoryDialog", () => {
  it("não renderiza nada quando não há dados de conclusão", () => {
    const { container } = render(
      <VictoryDialog
        open={false}
        onOpenChange={vi.fn()}
        completion={null}
        nextLessonHref={null}
        nextLessonTitle={null}
        courseTrackHref="/cursos/pm-soldado"
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("exibe título da aula, pontos, XP e progresso vindos do servidor", () => {
    render(
      <VictoryDialog
        open
        onOpenChange={vi.fn()}
        completion={completion}
        nextLessonHref="/cursos/pm-soldado/modulos/lingua-portuguesa/aulas/lesson-2"
        nextLessonTitle="Próxima aula da trilha"
        courseTrackHref="/cursos/pm-soldado"
      />,
    );

    expect(screen.getByText(/vitória conquistada/i)).toBeTruthy();
    expect(screen.getByText(/interpretação de texto/i)).toBeTruthy();
    expect(screen.getByText(/100 pts/i)).toBeTruthy();
    expect(screen.getByText(/100 xp/i)).toBeTruthy();
    expect(screen.getByText(/progresso no módulo/i)).toBeTruthy();
    expect(screen.getByText(/progresso no curso/i)).toBeTruthy();

    const nextLessonLink = screen.getByRole("link", { name: /próxima aula/i });
    expect(nextLessonLink.getAttribute("href")).toBe(
      "/cursos/pm-soldado/modulos/lingua-portuguesa/aulas/lesson-2",
    );
    const trackLink = screen.getByRole("link", { name: /voltar à trilha/i });
    expect(trackLink.getAttribute("href")).toBe("/cursos/pm-soldado");
  });

  it("não renderiza botão de próxima aula quando não há aula seguinte", () => {
    render(
      <VictoryDialog
        open
        onOpenChange={vi.fn()}
        completion={completion}
        nextLessonHref={null}
        nextLessonTitle={null}
        courseTrackHref="/cursos/pm-soldado"
      />,
    );

    expect(screen.queryByRole("link", { name: /próxima aula/i })).toBeNull();
  });
});
