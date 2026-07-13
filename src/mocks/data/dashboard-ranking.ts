/**
 * Mock de posição no ranking pré-computada por aluno (ADR-0011, CLAUDE.md §23).
 *
 * TODO(Fase 8 — agente `gamification`): a posição real vem de `RankingScore`,
 * materializada por período/concurso a partir da fórmula composta (CLAUDE.md §17 —
 * 35% simulados / 25% aulas / 20% constância / 10% tempo válido / 10% metas). Aqui é só
 * um valor pronto para o dashboard exibir. `contestId` deve coincidir com
 * `mockSelectedContests` (`dashboard-contest.ts`).
 */

export interface RankingEntity {
  position: number;
  totalParticipants: number;
  contestId: string;
}

/** Chave: `userId` (ver `src/mocks/data/users.ts`). */
export const mockRankings: Record<string, RankingEntity> = {
  "user-1": { position: 342, totalParticipants: 5810, contestId: "contest-pm-soldado" },
  "user-2": { position: 12, totalParticipants: 2140, contestId: "contest-gcm-agente" },
  "user-3": { position: 4102, totalParticipants: 5810, contestId: "contest-pm-soldado" },
  "user-4": { position: 1, totalParticipants: 980, contestId: "contest-pp-agente" },
};
