/**
 * Mock do concurso selecionado por aluno (ADR-0011, CLAUDE.md §23).
 *
 * TODO(Fase 7 — cursos/concursos): ainda não existe uma entidade `Contest` nem um
 * repositório dedicado (CLAUDE.md §10 lista `Contest` separado de `Course`). Enquanto
 * isso, o concurso selecionado é um literal simples aqui — quando o repositório de
 * concursos existir, o `dashboard-service` deve buscar por ele em vez deste mock.
 *
 * `contestId`/`contestName` DEVEM coincidir com o `contestId`/`contestName` do curso
 * referenciado por `dashboard-next-lesson.ts` (via `CourseEntity` em `courses.ts`) — caso
 * contrário o dashboard mostra um concurso selecionado sem curso correspondente no
 * catálogo. Fase 5 tinha essa inconsistência em `user-4` (`contest-bombeiro`, sem curso
 * no catálogo de 3 cursos desta fase); corrigido para `contest-pp-agente` (`course-3`,
 * Polícia Penal), coerente com `mockEnrollments`/`mockLessonProgress` (`enrollments.ts`,
 * `lesson-progress.ts`).
 */

export interface SelectedContestEntity {
  contestId: string;
  contestName: string;
}

/** Chave: `userId` (ver `src/mocks/data/users.ts`). */
export const mockSelectedContests: Record<string, SelectedContestEntity> = {
  "user-1": { contestId: "contest-pm-soldado", contestName: "Polícia Militar — Soldado" },
  "user-2": { contestId: "contest-gcm-agente", contestName: "Guarda Civil Municipal — Agente" },
  "user-3": { contestId: "contest-pm-soldado", contestName: "Polícia Militar — Soldado" },
  "user-4": {
    contestId: "contest-pp-agente",
    contestName: "Polícia Penal — Agente Penitenciário",
  },
};
