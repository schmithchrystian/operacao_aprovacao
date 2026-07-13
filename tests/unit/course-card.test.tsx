import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseCard } from "@/components/courses/course-card";
import type { CourseSummaryDTO } from "@/contracts/courses";

const baseCourse: CourseSummaryDTO = {
  id: "course-1",
  slug: "pm-soldado",
  title: "Polícia Militar — Soldado",
  description: "Preparatório completo para o cargo de Soldado da Polícia Militar.",
  contestId: "contest-pm-soldado",
  contestName: "Polícia Militar — Soldado",
  workloadHours: 180,
  teacherName: "Cap. Marcos Vieira",
  coverColor: "#1F2937",
  difficulty: "intermediario",
  subjects: ["Língua Portuguesa", "Raciocínio Lógico"],
  progressPercent: 0,
  status: "nao_iniciado",
  enrolled: false,
};

describe("CourseCard", () => {
  it("mostra 'Matricular' e não exibe barra de progresso quando o usuário não está matriculado", () => {
    render(<CourseCard course={baseCourse} />);

    expect(screen.getByRole("link", { name: /matricular/i })).toBeTruthy();
    expect(screen.queryByText("Não iniciado")).toBeNull();
  });

  it("mostra 'Continuar' e o progresso quando o curso está em andamento", () => {
    render(
      <CourseCard
        course={{ ...baseCourse, enrolled: true, status: "em_andamento", progressPercent: 42 }}
      />,
    );

    const link = screen.getByRole("link", { name: /continuar/i });
    expect(link.getAttribute("href")).toBe("/cursos/pm-soldado");
    expect(screen.getByText("42%")).toBeTruthy();
    expect(screen.getByText("Em andamento")).toBeTruthy();
  });

  it("mostra 'Ver curso' quando matriculado mas ainda não iniciado", () => {
    render(<CourseCard course={{ ...baseCourse, enrolled: true, status: "nao_iniciado" }} />);

    expect(screen.getByRole("link", { name: /ver curso/i })).toBeTruthy();
  });
});
