import { z } from "zod";

/**
 * DTOs de leitura do dashboard do aluno (Fase 5 — backend/leitura).
 *
 * IMPORTANTE — fronteira de domínio: este contrato só descreve a FORMA dos dados já
 * pré-computados que a UI consome. Nenhum valor aqui é calculado por este módulo:
 *
 * - pontos/XP/nível/sequência (streak) são autoritativos do agente `gamification` (Fase 8);
 * - tempo válido de estudo/metas/sequência de dias são autoritativos do agente
 *   `study-tracking` (Fase 12).
 *
 * Até essas fases chegarem, os valores vêm de `src/mocks/data/dashboard-*` (dados
 * estáticos, não recalculados) — ver `@/server/services/dashboard-service`.
 */

/** Nível de gamificação exibido (nome + índice). Faixas/XP mínimo definitivos: Fase 8. */
export const dashboardLevelSchema = z.object({
  /** 1 = Recruta ... 7 = Comandante (CLAUDE.md §16). */
  index: z.number().int().min(1),
  name: z.string().min(1),
});
export type DashboardLevel = z.infer<typeof dashboardLevelSchema>;

/**
 * Gamificação pré-computada (leitura). `nextLevelXp` é `null` quando o aluno já está no
 * nível máximo (Comandante) — não há barra de progresso para o "próximo" nível.
 */
export const dashboardGamificationSchema = z.object({
  level: dashboardLevelSchema,
  points: z.number().int().min(0),
  xp: z.number().int().min(0),
  /** XP mínimo do nível atual (base da barra de progresso). */
  currentLevelXp: z.number().int().min(0),
  /** XP mínimo do próximo nível, ou `null` no nível máximo. */
  nextLevelXp: z.number().int().min(0).nullable(),
  /** Sequência de dias consecutivos com estudo válido. */
  streakDays: z.number().int().min(0),
});
export type DashboardGamification = z.infer<typeof dashboardGamificationSchema>;

/** Estatísticas de estudo pré-computadas (leitura). Tempo válido definitivo: Fase 12. */
export const dashboardStudyStatsSchema = z.object({
  weeklyStudyMinutes: z.number().int().min(0),
  lessonsCompleted: z.number().int().min(0),
  mockExamsTaken: z.number().int().min(0),
  accuracyPercent: z.number().min(0).max(100),
});
export type DashboardStudyStats = z.infer<typeof dashboardStudyStatsSchema>;

/** Posição no ranking, sempre no escopo de um concurso. Fórmula definitiva: Fase 8. */
export const dashboardRankingSchema = z.object({
  position: z.number().int().min(1),
  totalParticipants: z.number().int().min(1),
  contestId: z.string().min(1),
});
export type DashboardRanking = z.infer<typeof dashboardRankingSchema>;

/** Próxima aula recomendada. `null` quando não há recomendação disponível. */
export const dashboardNextLessonSchema = z.object({
  courseId: z.string().min(1),
  courseTitle: z.string().min(1),
  moduleTitle: z.string().min(1),
  lessonId: z.string().min(1),
  lessonTitle: z.string().min(1),
  progressPercent: z.number().min(0).max(100),
  href: z.string().min(1),
});
export type DashboardNextLesson = z.infer<typeof dashboardNextLessonSchema>;

/** Meta (missão diária ou meta semanal) com alvo/progresso já pré-computados. */
export const dashboardGoalSchema = z.object({
  description: z.string().min(1),
  target: z.number().min(0),
  progress: z.number().min(0),
  unit: z.string().min(1),
  completed: z.boolean(),
});
export type DashboardGoal = z.infer<typeof dashboardGoalSchema>;

export const dashboardGoalsSchema = z.object({
  daily: dashboardGoalSchema,
  weekly: dashboardGoalSchema,
});
export type DashboardGoals = z.infer<typeof dashboardGoalsSchema>;

/** Resumo textual/curto de desempenho recente, já pré-computado. */
export const dashboardPerformanceSummarySchema = z.object({
  totalPointsThisWeek: z.number().int().min(0),
  accuracyTrend: z.enum(["up", "down", "stable"]),
  highlight: z.string().min(1),
});
export type DashboardPerformanceSummary = z.infer<typeof dashboardPerformanceSummarySchema>;

export const dashboardWeekdaySchema = z.enum(["seg", "ter", "qua", "qui", "sex", "sab", "dom"]);
export type DashboardWeekday = z.infer<typeof dashboardWeekdaySchema>;

/** Ponto da série "horas estudadas por dia da semana" (gráfico — Recharts fica com `frontend`). */
export const dashboardStudyHoursPointSchema = z.object({
  weekday: dashboardWeekdaySchema,
  minutes: z.number().int().min(0),
});
export type DashboardStudyHoursPoint = z.infer<typeof dashboardStudyHoursPointSchema>;

/** Desempenho (percentual de acerto) por matéria. */
export const dashboardSubjectPerformanceSchema = z.object({
  subject: z.string().min(1),
  accuracyPercent: z.number().min(0).max(100),
});
export type DashboardSubjectPerformance = z.infer<typeof dashboardSubjectPerformanceSchema>;

/** Conquista recente do aluno. */
export const dashboardAchievementSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Nome do ícone (lucide-react); mapeamento para o componente é responsabilidade do `frontend`. */
  icon: z.string().min(1),
  /** Data de conquista em ISO 8601. */
  achievedAt: z.string().min(1),
});
export type DashboardAchievement = z.infer<typeof dashboardAchievementSchema>;

/** Identidade exibida no topo do dashboard. */
export const dashboardIdentitySchema = z.object({
  studentName: z.string().min(1),
  selectedContestId: z.string().min(1),
  selectedContestName: z.string().min(1),
});
export type DashboardIdentity = z.infer<typeof dashboardIdentitySchema>;

/**
 * DTO agregado consumido pela página `(student)/dashboard`. Produzido por
 * `getStudentDashboard` (`@/server/services/dashboard-service`) — ver o TODO de cada
 * seção quanto à fonte definitiva (Fases 8/12).
 */
export const dashboardDTOSchema = z.object({
  identity: dashboardIdentitySchema,
  gamification: dashboardGamificationSchema,
  study: dashboardStudyStatsSchema,
  ranking: dashboardRankingSchema,
  nextLesson: dashboardNextLessonSchema.nullable(),
  goals: dashboardGoalsSchema,
  performanceSummary: dashboardPerformanceSummarySchema,
  studyHoursSeries: z.array(dashboardStudyHoursPointSchema),
  subjectPerformance: z.array(dashboardSubjectPerformanceSchema),
  recentAchievements: z.array(dashboardAchievementSchema),
});
export type DashboardDTO = z.infer<typeof dashboardDTOSchema>;
