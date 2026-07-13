import type { CourseEntity } from "@/server/repositories/contracts/course-repository";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23). Poucos itens — apenas o
 * suficiente para os repositórios mock funcionarem; seed rico vem com o Prisma.
 */
export const mockCourses: CourseEntity[] = [
  {
    id: "course-1",
    slug: "pm-soldado",
    title: "Polícia Militar — Soldado",
    description: "Preparatório completo para o cargo de Soldado da Polícia Militar.",
  },
  {
    id: "course-2",
    slug: "gcm-agente",
    title: "Guarda Civil Municipal — Agente",
    description: "Preparatório para o concurso de Agente da Guarda Civil Municipal.",
  },
];
