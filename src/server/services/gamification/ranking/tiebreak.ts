/**
 * Desempate determinístico do ranking (Fase 9 — agente `gamification`, CLAUDE.md §17).
 *
 * Critérios, em ordem, quando o `score` composto empata:
 * 1. maior aproveitamento em simulados (`mockExamPerformance`, valor bruto);
 * 2. mais aulas concluídas (`lessonsCompleted`, valor bruto);
 * 3. menor "tempo para pontuar" (`timeToScoreMs` — intervalo entre a primeira e a última
 *    atividade registrada; menor é mais eficiente);
 * 4. `userId` em ordem crescente — desempate final ESTÁVEL (nunca indefinido).
 *
 * Função PURA — sem I/O — para ser testável isoladamente e reaproveitável fora do fluxo de
 * recálculo (ex.: ordenar um preview antes de persistir).
 */
export interface RankingTieBreakInput {
  userId: string;
  score: number;
  mockExamPerformance: number;
  lessonsCompleted: number;
  timeToScoreMs: number;
}

/** Comparador para `Array.prototype.sort` — ordem decrescente de posição (1º lugar primeiro). */
export function compareRankingEntries(a: RankingTieBreakInput, b: RankingTieBreakInput): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }
  if (a.mockExamPerformance !== b.mockExamPerformance) {
    return b.mockExamPerformance - a.mockExamPerformance;
  }
  if (a.lessonsCompleted !== b.lessonsCompleted) {
    return b.lessonsCompleted - a.lessonsCompleted;
  }
  if (a.timeToScoreMs !== b.timeToScoreMs) {
    return a.timeToScoreMs - b.timeToScoreMs;
  }
  if (a.userId < b.userId) return -1;
  if (a.userId > b.userId) return 1;
  return 0;
}
