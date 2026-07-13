import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CourseCatalog } from "@/components/courses/course-catalog";
import type { CourseSummaryDTO } from "@/contracts/courses";

function makeCourse(overrides: Partial<CourseSummaryDTO>): CourseSummaryDTO {
  return {
    id: "course-1",
    slug: "pm-soldado",
    title: "Polícia Militar — Soldado",
    description: "Preparatório completo.",
    contestId: "contest-pm-soldado",
    contestName: "Polícia Militar — Soldado",
    workloadHours: 180,
    teacherName: "Cap. Marcos Vieira",
    coverColor: "#1F2937",
    difficulty: "intermediario",
    subjects: [],
    progressPercent: 0,
    status: "nao_iniciado",
    enrolled: false,
    ...overrides,
  };
}

const courses: CourseSummaryDTO[] = [
  makeCourse({ id: "course-1", slug: "pm-soldado", title: "Polícia Militar — Soldado", contestId: "contest-pm", contestName: "Polícia Militar" }),
  makeCourse({ id: "course-2", slug: "gcm-agente", title: "Guarda Civil Municipal — Agente", contestId: "contest-gcm", contestName: "Guarda Civil Municipal" }),
];

describe("CourseCatalog", () => {
  it("mostra todos os cursos por padrão e os chips de filtro por concurso", () => {
    render(<CourseCatalog courses={courses} />);

    expect(screen.getByText("Polícia Militar — Soldado")).toBeTruthy();
    expect(screen.getByText("Guarda Civil Municipal — Agente")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Todos" })).toBeTruthy();
  });

  it("filtra a grade ao clicar em um concurso específico", async () => {
    const user = userEvent.setup();
    render(<CourseCatalog courses={courses} />);

    await user.click(screen.getByRole("button", { name: "Guarda Civil Municipal" }));

    expect(screen.getByText("Guarda Civil Municipal — Agente")).toBeTruthy();
    expect(screen.queryByText("Polícia Militar — Soldado")).toBeNull();
  });

  it("não mostra os chips de filtro quando há um único concurso no catálogo", () => {
    render(<CourseCatalog courses={[courses[0]!]} />);

    expect(screen.queryByRole("button", { name: "Todos" })).toBeNull();
  });
});
