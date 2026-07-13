/**
 * Mock do concurso selecionado por aluno (ADR-0011, CLAUDE.md §23).
 *
 * TODO(Fase 7 — cursos/concursos): ainda não existe uma entidade `Contest` nem um
 * repositório dedicado (CLAUDE.md §10 lista `Contest` separado de `Course`). Enquanto
 * isso, o concurso selecionado é um literal simples aqui — quando o repositório de
 * concursos existir, o `dashboard-service` deve buscar por ele em vez deste mock.
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
  "user-4": { contestId: "contest-bombeiro", contestName: "Corpo de Bombeiros Militar" },
};
