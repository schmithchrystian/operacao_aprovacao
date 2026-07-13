/**
 * Mock de conquistas recentes por aluno (ADR-0011, CLAUDE.md §23).
 *
 * TODO(Fase 8 — agente `gamification`): a lista definitiva vem de `UserAchievement`
 * (data real de concessão, sem duplicidade). Aqui os itens já vêm prontos.
 */

export interface AchievementEntity {
  id: string;
  name: string;
  /** Nome do ícone `lucide-react`; o `frontend` resolve para o componente. */
  icon: string;
  /** Data de conquista em ISO 8601. */
  achievedAt: string;
}

/** Chave: `userId` (ver `src/mocks/data/users.ts`). */
export const mockRecentAchievements: Record<string, AchievementEntity[]> = {
  "user-1": [
    { id: "ach-first-lesson", name: "Primeira aula concluída", icon: "PlayCircle", achievedAt: "2026-06-20T12:00:00.000Z" },
    { id: "ach-streak-7", name: "Sequência de 7 dias", icon: "Flame", achievedAt: "2026-07-05T09:30:00.000Z" },
    { id: "ach-first-mock-exam", name: "Primeiro simulado concluído", icon: "ClipboardCheck", achievedAt: "2026-07-10T18:45:00.000Z" },
  ],
  "user-2": [
    { id: "ach-streak-7", name: "Sequência de 7 dias", icon: "Flame", achievedAt: "2026-06-15T09:00:00.000Z" },
    { id: "ach-module-complete", name: "Módulo concluído", icon: "BookCheck", achievedAt: "2026-06-28T14:20:00.000Z" },
    { id: "ach-streak-30", name: "Sequência de 30 dias", icon: "Trophy", achievedAt: "2026-07-11T08:00:00.000Z" },
  ],
  "user-3": [
    { id: "ach-first-lesson", name: "Primeira aula concluída", icon: "PlayCircle", achievedAt: "2026-07-01T10:00:00.000Z" },
  ],
  "user-4": [
    { id: "ach-course-complete", name: "Curso concluído", icon: "GraduationCap", achievedAt: "2026-05-30T16:00:00.000Z" },
    { id: "ach-streak-30", name: "Sequência de 30 dias", icon: "Trophy", achievedAt: "2026-06-25T11:15:00.000Z" },
    { id: "ach-top-1", name: "1º lugar no ranking", icon: "Crown", achievedAt: "2026-07-12T20:00:00.000Z" },
  ],
};
