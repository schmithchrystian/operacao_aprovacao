import type { TeacherEntity } from "@/server/repositories/contracts/teacher-repository";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23). Fase 17 — agente `backend` (admin de
 * conteúdo). Seed mínimo — `CourseEntity.teacherName` (`./courses.ts`) ainda é texto livre
 * (pendência pré-existente, ver `course-repository.ts`), então estes registros não estão
 * vinculados aos cursos mock; servem para exercitar o cadastro administrativo de professores.
 */
export const mockTeachers: TeacherEntity[] = [
  {
    id: "teacher-1",
    userId: "user-2",
    name: "Bruno Professor",
    bio: "Professor de Direito Constitucional e Administrativo.",
    avatarUrl: null,
    deletedAt: null,
  },
];
