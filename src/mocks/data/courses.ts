import type { CourseEntity } from "@/server/repositories/contracts/course-repository";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23). 3 cursos (Fase 6 —
 * Polícia Militar, Guarda Civil Municipal, Polícia Penal), cada um com módulos e aulas em
 * `modules.ts`/`lessons.ts`. `contestId`/`contestName` devem coincidir com
 * `mockSelectedContests` (`dashboard-contest.ts`) para o curso ser coerente com o concurso
 * selecionado do aluno no dashboard.
 */
export const mockCourses: CourseEntity[] = [
  {
    id: "course-1",
    slug: "pm-soldado",
    title: "Polícia Militar — Soldado",
    description: "Preparatório completo para o cargo de Soldado da Polícia Militar.",
    contestId: "contest-pm-soldado",
    contestName: "Polícia Militar — Soldado",
    teacherName: "Cap. Marcos Vieira",
    workloadHours: 180,
    coverColor: "#1F2937",
    difficulty: "intermediario",
    status: "PUBLISHED",
    deletedAt: null,
  },
  {
    id: "course-2",
    slug: "gcm-agente",
    title: "Guarda Civil Municipal — Agente",
    description: "Preparatório para o concurso de Agente da Guarda Civil Municipal.",
    contestId: "contest-gcm-agente",
    contestName: "Guarda Civil Municipal — Agente",
    teacherName: "Insp. Renata Alves",
    workloadHours: 150,
    coverColor: "#374151",
    difficulty: "iniciante",
    status: "PUBLISHED",
    deletedAt: null,
  },
  {
    id: "course-3",
    slug: "pp-agente",
    title: "Polícia Penal — Agente Penitenciário",
    description: "Preparatório completo para o cargo de Agente da Polícia Penal.",
    contestId: "contest-pp-agente",
    contestName: "Polícia Penal — Agente Penitenciário",
    teacherName: "Agente Felipe Torres",
    workloadHours: 200,
    coverColor: "#111827",
    difficulty: "avancado",
    status: "PUBLISHED",
    deletedAt: null,
  },
];
