/**
 * Mock de posição no ranking pré-computada por aluno (ADR-0011, CLAUDE.md §23).
 *
 * Fase 9 (agente `gamification`) entregou o motor real de ranking
 * (`src/server/services/gamification/ranking`), mas o `dashboard-service` ainda lê este mock
 * separado em vez de chamar `getRanking` (ver TODO em `dashboard-service.ts`) — para não
 * divergir do resultado real, `user-1` foi ajustado para o valor que o motor de fato calcula
 * no escopo `CONTEST/contest-pm-soldado`, período `ALL_TIME`, versão 1, sobre o dataset de
 * `src/mocks/data/ranking-participants.ts` (13 participantes no concurso PM-Soldado; `user-1`
 * fica na posição 7 — conferido via `recalculateRankingForScope`). `user-2`/`user-3`/`user-4`
 * não são "aluno" (ver `mockUsers`) e não entraram no dataset de participantes do ranking
 * real — seus valores permanecem ilustrativos como antes desta fase.
 */

export interface RankingEntity {
  position: number;
  totalParticipants: number;
  contestId: string;
}

/** Chave: `userId` (ver `src/mocks/data/users.ts`). */
export const mockRankings: Record<string, RankingEntity> = {
  "user-1": { position: 7, totalParticipants: 13, contestId: "contest-pm-soldado" },
  "user-2": { position: 12, totalParticipants: 2140, contestId: "contest-gcm-agente" },
  "user-3": { position: 4102, totalParticipants: 5810, contestId: "contest-pm-soldado" },
  "user-4": { position: 1, totalParticipants: 980, contestId: "contest-pp-agente" },
};
