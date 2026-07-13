import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LessonRow } from "@/components/courses/lesson-row";
import type { LessonSummaryDTO } from "@/contracts/courses";

const baseLesson: LessonSummaryDTO = {
  id: "lesson-1",
  order: 1,
  title: "Interpretação de texto",
  durationMinutes: 30,
  status: "available",
};

describe("LessonRow", () => {
  it("renderiza um link navegável para aulas disponíveis", () => {
    render(<LessonRow lesson={baseLesson} href="/cursos/pm-soldado/modulos/lingua-portuguesa/aulas/lesson-1" />);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/cursos/pm-soldado/modulos/lingua-portuguesa/aulas/lesson-1");
  });

  it("não renderiza link para aulas bloqueadas e marca aria-disabled com dica visível", () => {
    const { container } = render(
      <LessonRow lesson={{ ...baseLesson, status: "locked" }} href="/cursos/x/modulos/y/aulas/lesson-1" />,
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText(/conclua a aula anterior/i)).toBeTruthy();
    expect(container.querySelector('[aria-disabled="true"]')).toBeTruthy();
  });
});
