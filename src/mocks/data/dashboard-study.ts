import type {
  DashboardStudyHoursPoint,
  DashboardSubjectPerformance,
  DashboardWeekday,
} from "@/contracts/dashboard";

/**
 * Mock de estatísticas de estudo pré-computadas por aluno (ADR-0011, CLAUDE.md §23).
 *
 * TODO(Fase 12 — agente `study-tracking`): tempo estudado, aulas concluídas, simulados e
 * percentual de acertos aqui são literais fixos. A fonte definitiva será o cálculo real
 * de tempo válido (heartbeat, sinais de atividade — CLAUDE.md §14) sobre
 * `StudySession`/`StudyActivity`, nunca a diferença simples entre início e fim.
 */

const WEEKDAYS: readonly DashboardWeekday[] = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];

export interface StudyStatsEntity {
  weeklyStudyMinutes: number;
  lessonsCompleted: number;
  mockExamsTaken: number;
  accuracyPercent: number;
  studyHoursSeries: DashboardStudyHoursPoint[];
  subjectPerformance: DashboardSubjectPerformance[];
}

function buildWeekSeries(minutesByDay: readonly number[]): DashboardStudyHoursPoint[] {
  return WEEKDAYS.map((weekday, index) => ({
    weekday,
    minutes: minutesByDay[index] ?? 0,
  }));
}

/** Chave: `userId` (ver `src/mocks/data/users.ts`). */
export const mockStudyStats: Record<string, StudyStatsEntity> = {
  "user-1": {
    weeklyStudyMinutes: 620,
    lessonsCompleted: 18,
    mockExamsTaken: 3,
    accuracyPercent: 72,
    studyHoursSeries: buildWeekSeries([90, 60, 75, 45, 100, 130, 120]),
    subjectPerformance: [
      { subject: "Direito Constitucional", accuracyPercent: 78 },
      { subject: "Direito Administrativo", accuracyPercent: 65 },
      { subject: "Português", accuracyPercent: 81 },
      { subject: "Raciocínio Lógico", accuracyPercent: 58 },
      { subject: "Legislação Especial", accuracyPercent: 70 },
    ],
  },
  "user-2": {
    weeklyStudyMinutes: 940,
    lessonsCompleted: 34,
    mockExamsTaken: 7,
    accuracyPercent: 84,
    studyHoursSeries: buildWeekSeries([120, 110, 130, 90, 140, 160, 150]),
    subjectPerformance: [
      { subject: "Direito Constitucional", accuracyPercent: 88 },
      { subject: "Direito Penal", accuracyPercent: 80 },
      { subject: "Português", accuracyPercent: 86 },
    ],
  },
  "user-3": {
    weeklyStudyMinutes: 210,
    lessonsCompleted: 6,
    mockExamsTaken: 1,
    accuracyPercent: 55,
    studyHoursSeries: buildWeekSeries([0, 30, 0, 45, 0, 60, 75]),
    subjectPerformance: [
      { subject: "Português", accuracyPercent: 60 },
      { subject: "Raciocínio Lógico", accuracyPercent: 50 },
    ],
  },
  "user-4": {
    weeklyStudyMinutes: 1200,
    lessonsCompleted: 52,
    mockExamsTaken: 12,
    accuracyPercent: 91,
    studyHoursSeries: buildWeekSeries([150, 160, 170, 155, 180, 200, 185]),
    subjectPerformance: [
      { subject: "Direito Constitucional", accuracyPercent: 93 },
      { subject: "Direito Administrativo", accuracyPercent: 90 },
      { subject: "Português", accuracyPercent: 92 },
      { subject: "Raciocínio Lógico", accuracyPercent: 88 },
    ],
  },
};

export interface PerformanceSummaryEntity {
  totalPointsThisWeek: number;
  accuracyTrend: "up" | "down" | "stable";
  highlight: string;
}

/** Chave: `userId` (ver `src/mocks/data/users.ts`). */
export const mockPerformanceSummaries: Record<string, PerformanceSummaryEntity> = {
  "user-1": {
    totalPointsThisWeek: 980,
    accuracyTrend: "up",
    highlight: "Seu melhor desempenho da semana foi em Português (81% de acerto).",
  },
  "user-2": {
    totalPointsThisWeek: 2150,
    accuracyTrend: "up",
    highlight: "Sequência de 12 dias mantida — continue estudando Direito Penal.",
  },
  "user-3": {
    totalPointsThisWeek: 240,
    accuracyTrend: "down",
    highlight: "Poucos estudos essa semana — retome o ritmo em Raciocínio Lógico.",
  },
  "user-4": {
    totalPointsThisWeek: 3400,
    accuracyTrend: "stable",
    highlight: "Desempenho consistente acima de 90% em todas as matérias.",
  },
};
