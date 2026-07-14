import { z } from "zod";
import { idSchema } from "./common";
import { subjectPerformanceDTOSchema, topicPerformanceDTOSchema } from "./simulations";

/**
 * Contratos de acompanhamento e diagnóstico de preparação (Fase 12 — agente `study-tracking`,
 * CLAUDE.md §14/§31 item "acompanhamento").
 *
 * Reaproveita `subjectPerformanceDTOSchema`/`topicPerformanceDTOSchema` de
 * `@/contracts/simulations` (Fase 10) em vez de redefinir a mesma forma — mesmo aproveitamento
 * de aproveitamento/tentativas de simulado usado no resultado de uma tentativa individual,
 * agora agregado por TODO o histórico do usuário (`@/server/services/study-tracking/tracking-overview`).
 *
 * Datas de calendário são ISO 8601 à meia-noite UTC (mesma convenção de `@/contracts/study-plan`).
 */

export const trackingStreakDTOSchema = z.object({
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  lastActiveDate: z.string().nullable(),
  freezesAvailable: z.number().int().min(0),
});
export type TrackingStreakDTO = z.infer<typeof trackingStreakDTOSchema>;

/** Meta (diária ou semanal) com alvo(s) e progresso já recomputados a partir do ledger real
 *  (nunca cacheado — ver `@/server/repositories/contracts/daily-goal-repository`). */
export const trackingGoalDTOSchema = z.object({
  targetMinutes: z.number().int().min(0).nullable(),
  targetPoints: z.number().int().min(0).nullable(),
  progressMinutes: z.number().int().min(0),
  progressPoints: z.number().int().min(0),
  achieved: z.boolean(),
  /** ISO 8601, ou `null` enquanto não atingida. */
  achievedAt: z.string().nullable(),
});
export type TrackingGoalDTO = z.infer<typeof trackingGoalDTOSchema>;

export const trackingHoursSummaryDTOSchema = z.object({
  todayMinutes: z.number().int().min(0),
  weekMinutes: z.number().int().min(0),
  monthMinutes: z.number().int().min(0),
});
export type TrackingHoursSummaryDTO = z.infer<typeof trackingHoursSummaryDTOSchema>;

/** Ponto de evolução semanal (gráfico "evolução semanal") — janela fixa e recente (ver serviço). */
export const trackingWeeklyPointDTOSchema = z.object({
  /** ISO 8601 (meia-noite UTC) da segunda-feira da semana. */
  weekStart: z.string().min(1),
  minutes: z.number().int().min(0),
});
export type TrackingWeeklyPointDTO = z.infer<typeof trackingWeeklyPointDTOSchema>;

/** Ponto de evolução mensal (gráfico "evolução mensal"). */
export const trackingMonthlyPointDTOSchema = z.object({
  /** `yyyy-mm`. */
  month: z.string().min(1),
  minutes: z.number().int().min(0),
});
export type TrackingMonthlyPointDTO = z.infer<typeof trackingMonthlyPointDTOSchema>;

/** Distribuição do tempo válido de estudo por matéria (gráfico "distribuição de tempo"). */
export const trackingTimeDistributionEntryDTOSchema = z.object({
  subjectId: idSchema,
  subjectName: z.string().min(1),
  minutes: z.number().int().min(0),
});
export type TrackingTimeDistributionEntryDTO = z.infer<typeof trackingTimeDistributionEntryDTOSchema>;

export const trackingQuestionsSummaryDTOSchema = z.object({
  totalAnswered: z.number().int().min(0),
  totalCorrect: z.number().int().min(0),
  accuracyPercent: z.number().min(0).max(100),
  /** `null` quando não há nenhuma questão respondida com tempo registrado ainda. */
  averageSecondsPerQuestion: z.number().min(0).nullable(),
});
export type TrackingQuestionsSummaryDTO = z.infer<typeof trackingQuestionsSummaryDTOSchema>;

/** Conteúdo (matéria, ou assunto quando `topicId` não é `null`) com aproveitamento abaixo do
 *  limiar configurado (`STUDY_TRACKING_OVERVIEW.weakSubjectAccuracyThreshold`). */
export const trackingWeakContentDTOSchema = z.object({
  subjectId: idSchema,
  subjectName: z.string().min(1),
  topicId: idSchema.nullable(),
  topicName: z.string().nullable(),
  accuracyPercent: z.number().min(0).max(100),
  totalAnswered: z.number().int().min(0),
});
export type TrackingWeakContentDTO = z.infer<typeof trackingWeakContentDTOSchema>;

/** Matéria sem nenhum engajamento registrado ainda (nem questão respondida, nem tempo válido de estudo). */
export const trackingPendingContentDTOSchema = z.object({
  subjectId: idSchema,
  subjectName: z.string().min(1),
});
export type TrackingPendingContentDTO = z.infer<typeof trackingPendingContentDTOSchema>;

/** Item de revisão (`StudyPlanItem.kind === "REVIEW"`) com `targetDate` no passado e status
 *  ainda não terminal — ver `@/server/services/study-plan/mappers#computeProgress`. */
export const trackingOverdueReviewDTOSchema = z.object({
  itemId: idSchema,
  title: z.string().min(1),
  subjectName: z.string().nullable(),
  /** ISO 8601 (meia-noite UTC). */
  targetDate: z.string().min(1),
  daysLate: z.number().int().min(0),
});
export type TrackingOverdueReviewDTO = z.infer<typeof trackingOverdueReviewDTOSchema>;

export const trackingConsistencyDTOSchema = z.object({
  windowDays: z.number().int().min(1),
  activeDays: z.number().int().min(0),
  consistencyPercent: z.number().min(0).max(100),
});
export type TrackingConsistencyDTO = z.infer<typeof trackingConsistencyDTOSchema>;

/** Progresso do plano de estudos em relação à data da prova (gráfico "progresso até a prova"). */
export const trackingExamProgressDTOSchema = z.object({
  /** ISO 8601, ou `null` quando o plano não tem prova/plano definido. */
  examDate: z.string().nullable(),
  daysUntilExam: z.number().int().nullable(),
  planProgressPercent: z.number().min(0).max(100).nullable(),
  /**
   * Progresso ESPERADO (0–100) dado o tempo já decorrido desde o início do plano até a prova —
   * linear (`diasDecorridos / diasTotais * 100`). `null` quando não há plano/prova definidos.
   * Comparado a `planProgressPercent` pelo diagnóstico (`./tracking.ts` → `diagnosis.ts`) para
   * estimar o risco de atraso.
   */
  expectedProgressPercent: z.number().min(0).max(100).nullable(),
});
export type TrackingExamProgressDTO = z.infer<typeof trackingExamProgressDTOSchema>;

/**
 * DTO agregado consumido pela página "Acompanhamento". Produzido por `getTrackingOverview`
 * (`@/server/services/study-tracking/tracking-overview`). Nenhum cálculo acontece na UI —
 * tudo aqui já é o resultado final (gráficos só desenham).
 */
export const trackingOverviewDTOSchema = z.object({
  hours: trackingHoursSummaryDTOSchema,
  lessonsCompleted: z.number().int().min(0),
  questions: trackingQuestionsSummaryDTOSchema,
  weeklyEvolution: z.array(trackingWeeklyPointDTOSchema),
  monthlyEvolution: z.array(trackingMonthlyPointDTOSchema),
  subjectPerformance: z.array(subjectPerformanceDTOSchema),
  topicPerformance: z.array(topicPerformanceDTOSchema),
  timeDistribution: z.array(trackingTimeDistributionEntryDTOSchema),
  weakContents: z.array(trackingWeakContentDTOSchema),
  pendingContents: z.array(trackingPendingContentDTOSchema),
  overdueReviews: z.array(trackingOverdueReviewDTOSchema),
  consistency: trackingConsistencyDTOSchema,
  examProgress: trackingExamProgressDTOSchema,
  streak: trackingStreakDTOSchema,
  dailyGoal: trackingGoalDTOSchema,
  weeklyGoal: trackingGoalDTOSchema,
});
export type TrackingOverviewDTO = z.infer<typeof trackingOverviewDTOSchema>;

// ---------------------------------------------------------------------------
// Diagnóstico de preparação
// ---------------------------------------------------------------------------

/** Risco de atraso em relação ao ritmo necessário até a prova (`diagnosis.ts` — heurística pura). */
export const diagnosisRiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type DiagnosisRiskLevel = z.infer<typeof diagnosisRiskLevelSchema>;

/**
 * Diagnóstico de preparação, derivado de `TrackingOverviewDTO` por uma heurística PURA e
 * determinística (`@/server/services/study-tracking/diagnosis#computeDiagnosis`) — nunca uma
 * "IA mágica": cada frase é rastreável a um limiar documentado em `config/business.ts`.
 */
export const diagnosisDTOSchema = z.object({
  strengths: z.array(z.string().min(1)),
  weaknesses: z.array(z.string().min(1)),
  /** Até 5 prioridades, ordenadas da mais urgente para a menos urgente. */
  priorities: z.array(z.string().min(1)),
  delayRisk: diagnosisRiskLevelSchema,
  delayRiskReason: z.string().min(1),
  suggestions: z.array(z.string().min(1)),
});
export type DiagnosisDTO = z.infer<typeof diagnosisDTOSchema>;
