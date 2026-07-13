import type { EnrollmentEntity } from "@/server/repositories/contracts/enrollment-repository";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23). Matrículas coerentes com o
 * concurso selecionado de cada aluno em `dashboard-contest.ts`:
 * - user-1 / user-3 → contest-pm-soldado → course-1;
 * - user-2 → contest-gcm-agente → course-2;
 * - user-4 → contest-pp-agente → course-3 (Fase 5 tinha `contest-bombeiro` sem curso
 *   correspondente — corrigido nesta fase, ver `dashboard-contest.ts`).
 */
export const mockEnrollments: EnrollmentEntity[] = [
  { id: "enr-1", userId: "user-1", courseId: "course-1", status: "active", enrolledAt: "2026-05-01T12:00:00.000Z" },
  { id: "enr-2", userId: "user-2", courseId: "course-2", status: "active", enrolledAt: "2026-04-15T09:00:00.000Z" },
  { id: "enr-3", userId: "user-3", courseId: "course-1", status: "active", enrolledAt: "2026-06-10T08:00:00.000Z" },
  { id: "enr-4", userId: "user-4", courseId: "course-3", status: "active", enrolledAt: "2026-01-20T10:00:00.000Z" },
];
