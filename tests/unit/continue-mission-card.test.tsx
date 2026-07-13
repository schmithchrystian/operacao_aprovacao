import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContinueMissionCard } from "@/components/dashboard/continue-mission-card";
import type { DashboardNextLesson } from "@/contracts/dashboard";

const nextLesson: DashboardNextLesson = {
  courseId: "course-1",
  courseTitle: "Polícia Militar — Soldado",
  moduleTitle: "Direito Constitucional",
  lessonId: "lesson-12",
  lessonTitle: "Direitos e garantias fundamentais",
  progressPercent: 35,
  href: "/cursos/pm-soldado/modulos/direito-constitucional/aulas/lesson-12",
};

describe("ContinueMissionCard", () => {
  it("mostra a próxima aula recomendada com link para continuar estudando", () => {
    render(<ContinueMissionCard nextLesson={nextLesson} />);

    expect(screen.getByText("Direitos e garantias fundamentais")).toBeTruthy();
    const link = screen.getByRole("link", { name: /continuar estudando/i });
    expect(link.getAttribute("href")).toBe(nextLesson.href);
  });

  it("mostra um estado vazio quando não houver aula recomendada", () => {
    render(<ContinueMissionCard nextLesson={null} />);

    expect(screen.getByText(/nenhuma aula recomendada/i)).toBeTruthy();
  });
});
