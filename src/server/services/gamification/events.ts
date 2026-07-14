import type { GamificationEventType } from "@/server/repositories/contracts/gamification-event-repository";

/**
 * Payloads de eventos de domínio que alimentam a gamificação (Fase 8 — ADR-0007). Cada tipo
 * tem seu handler correspondente em `./handlers.ts`. Handlers marcados "TODO" abaixo estão
 * PRONTOS (tipagem + lógica de premiação) mas ainda não têm emissor real — a fase dona do
 * domínio de origem deve chamar `eventBus.emit` com o payload/idempotencyKey correspondentes
 * quando implementar o fluxo (ver comentário de cada tipo).
 */

export interface LessonCompletedPayload {
  userId: string;
  lessonId: string;
  lessonTitle: string;
}

export interface ModuleCompletedPayload {
  userId: string;
  moduleId: string;
  moduleTitle: string;
  courseId: string;
}

export interface CourseCompletedPayload {
  userId: string;
  courseId: string;
  courseTitle: string;
}

/** TODO(Fase 14 — flashcards): emitir ao registrar uma revisão classificada como correta. */
export interface FlashcardCorrectPayload {
  userId: string;
  flashcardId: string;
  reviewId: string;
}

/** TODO(Fase 15 — modo foco/Pomodoro): emitir ao concluir um ciclo Pomodoro com atividade real. */
export interface PomodoroCompletedPayload {
  userId: string;
  pomodoroSessionId: string;
}

/** Emitido por `simulations/submit-and-finalize.ts` ao finalizar (corrigir) uma tentativa. */
export interface MockExamCompletedPayload {
  userId: string;
  mockExamAttemptId: string;
  mockExamId: string;
  /** Percentual (0–100) de acerto na tentativa — usado por `bestMockExamAccuracyPercent`. */
  accuracyPercent: number;
}

/** Emitido por `simulations/submit-and-finalize.ts`, uma vez por questão corrigida como correta. */
export interface QuestionCorrectPayload {
  userId: string;
  questionAttemptId: string;
  questionId: string;
}

/** TODO(Fase 11/12 — plano de estudos/study-tracking): emitir ao fechar o dia com a meta batida. */
export interface DailyGoalCompletedPayload {
  userId: string;
  dailyGoalId: string;
  /** Data (YYYY-MM-DD) da meta — parte da chave de idempotência. */
  date: string;
}

/** TODO(Fase 11/12 — plano de estudos/study-tracking): emitir ao fechar a semana com a meta batida. */
export interface WeeklyGoalCompletedPayload {
  userId: string;
  weeklyGoalId: string;
  /** Início da semana (YYYY-MM-DD) — parte da chave de idempotência. */
  weekStart: string;
}

/** TODO(Fase 12 — study-tracking/`UserStreak`): emitir quando o streak cruzar 7 ou 30 dias. */
export interface StreakReachedPayload {
  userId: string;
  /** Só os marcos com recompensa própria (CLAUDE.md §15). */
  milestone: 7 | 30;
}

/** Constrói a `idempotencyKey` no padrão `<tipo>:<userId>:<entidadeId>` (CLAUDE.md §15/§25). */
export function buildIdempotencyKey(type: GamificationEventType, userId: string, sourceId: string): string {
  const slug = type.toLowerCase().replaceAll("_", "-");
  return `${slug}:${userId}:${sourceId}`;
}
