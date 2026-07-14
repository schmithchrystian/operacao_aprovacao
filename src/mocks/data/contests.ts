import type { ContestEntity } from "@/server/repositories/contracts/contest-repository";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23). Fase 17 — agente `backend` (admin de
 * conteúdo). `id`/`name` coincidem com `mockSelectedContests` (`./dashboard-contest.ts`) e com
 * `CourseEntity.contestId`/`contestName` (`./courses.ts`) para o catálogo administrativo já
 * nascer coerente com os cursos existentes.
 */
export const mockContests: ContestEntity[] = [
  {
    id: "contest-pm-soldado",
    slug: "pm-soldado",
    name: "Polícia Militar — Soldado",
    organizingBoard: null,
    description: "Concurso para o cargo de Soldado da Polícia Militar.",
    deletedAt: null,
  },
  {
    id: "contest-gcm-agente",
    slug: "gcm-agente",
    name: "Guarda Civil Municipal — Agente",
    organizingBoard: null,
    description: "Concurso para o cargo de Agente da Guarda Civil Municipal.",
    deletedAt: null,
  },
  {
    id: "contest-pp-agente",
    slug: "pp-agente",
    name: "Polícia Penal — Agente Penitenciário",
    organizingBoard: null,
    description: "Concurso para o cargo de Agente da Polícia Penal.",
    deletedAt: null,
  },
];
