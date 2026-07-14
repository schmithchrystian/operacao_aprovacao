import type { DomainEvent } from "@/server/events";
import { awardGamificationEvent, syncAchievementsForUser } from "./engine";
import type {
  CourseCompletedPayload,
  DailyGoalCompletedPayload,
  FlashcardCorrectPayload,
  LessonCompletedPayload,
  ModuleCompletedPayload,
  MockExamCompletedPayload,
  PomodoroCompletedPayload,
  QuestionCorrectPayload,
  StreakReachedPayload,
  WeeklyGoalCompletedPayload,
} from "./events";

/**
 * Handlers de eventos de gamificação (Fase 8 — agente `gamification`, ADR-0007).
 *
 * Cada handler segue o mesmo formato: 1) credita a recompensa via `awardGamificationEvent`
 * (idempotente, motor central — `./engine.ts`); 2) reavalia conquistas do usuário
 * (`syncAchievementsForUser`, também idempotente). Nenhum handler calcula pontos/XP
 * diretamente — o valor vem sempre de `GAMIFICATION_REWARDS` (`config/business.ts`) através
 * do motor.
 *
 * `LessonCompleted`/`ModuleCompleted`/`CourseCompleted` já têm emissor real (Fase 7/8,
 * `study-tracking/record-heartbeat.ts`); `MockExamCompleted`/`QuestionCorrect` também (Fase 10,
 * `simulations/submit-and-finalize.ts`). Os demais (flashcard/Pomodoro/metas/streak) estão
 * prontos — TIPO E LÓGICA DE PREMIAÇÃO — mas aguardam o emissor da fase dona (ver `./events.ts`
 * para o TODO específico de cada um); registrá-los aqui não tem efeito hoje porque nada ainda
 * invoca `eventBus.emit` para esses tipos.
 */

export async function handleLessonCompleted(event: DomainEvent<LessonCompletedPayload>): Promise<void> {
  const { userId, lessonId, lessonTitle } = event.payload;
  await awardGamificationEvent({
    userId,
    type: "LESSON_COMPLETED",
    sourceType: "LESSON",
    sourceId: lessonId,
    idempotencyKey: event.idempotencyKey,
    reason: `Aula concluída: ${lessonTitle}`,
    now: event.occurredAt,
  });
  await syncAchievementsForUser(userId, event.occurredAt);
}

export async function handleModuleCompleted(event: DomainEvent<ModuleCompletedPayload>): Promise<void> {
  const { userId, moduleId, moduleTitle } = event.payload;
  await awardGamificationEvent({
    userId,
    type: "MODULE_COMPLETED",
    sourceType: "MODULE",
    sourceId: moduleId,
    idempotencyKey: event.idempotencyKey,
    reason: `Módulo concluído: ${moduleTitle}`,
    now: event.occurredAt,
  });
  await syncAchievementsForUser(userId, event.occurredAt);
}

export async function handleCourseCompleted(event: DomainEvent<CourseCompletedPayload>): Promise<void> {
  const { userId, courseId, courseTitle } = event.payload;
  await awardGamificationEvent({
    userId,
    type: "COURSE_COMPLETED",
    sourceType: "COURSE",
    sourceId: courseId,
    idempotencyKey: event.idempotencyKey,
    reason: `Curso concluído: ${courseTitle}`,
    now: event.occurredAt,
  });
  await syncAchievementsForUser(userId, event.occurredAt);
}

/** TODO(Fase 14 — flashcards): sem emissor ainda; pronto para ser ligado. */
export async function handleFlashcardCorrect(event: DomainEvent<FlashcardCorrectPayload>): Promise<void> {
  const { userId, flashcardId, reviewId } = event.payload;
  await awardGamificationEvent({
    userId,
    type: "FLASHCARD_CORRECT",
    sourceType: "FLASHCARD_REVIEW",
    sourceId: reviewId,
    idempotencyKey: event.idempotencyKey,
    reason: `Flashcard correto: ${flashcardId}`,
    now: event.occurredAt,
  });
  await syncAchievementsForUser(userId, event.occurredAt);
}

/** TODO(Fase 15 — modo foco/Pomodoro): sem emissor ainda; pronto para ser ligado. */
export async function handlePomodoroCompleted(event: DomainEvent<PomodoroCompletedPayload>): Promise<void> {
  const { userId, pomodoroSessionId } = event.payload;
  await awardGamificationEvent({
    userId,
    type: "POMODORO_COMPLETED",
    sourceType: "POMODORO_SESSION",
    sourceId: pomodoroSessionId,
    idempotencyKey: event.idempotencyKey,
    reason: "Pomodoro concluído",
    now: event.occurredAt,
  });
  await syncAchievementsForUser(userId, event.occurredAt);
}

/** Emissor real: `src/server/services/simulations/submit-and-finalize.ts` (Fase 10). */
export async function handleMockExamCompleted(event: DomainEvent<MockExamCompletedPayload>): Promise<void> {
  const { userId, mockExamAttemptId, mockExamId } = event.payload;
  await awardGamificationEvent({
    userId,
    type: "MOCK_EXAM_COMPLETED",
    sourceType: "MOCK_EXAM_ATTEMPT",
    sourceId: mockExamAttemptId,
    idempotencyKey: event.idempotencyKey,
    reason: `Simulado concluído: ${mockExamId}`,
    context: { accuracyPercent: event.payload.accuracyPercent },
    now: event.occurredAt,
  });
  await syncAchievementsForUser(userId, event.occurredAt);
}

/** Emissor real: `src/server/services/simulations/submit-and-finalize.ts` (Fase 10). */
export async function handleQuestionCorrect(event: DomainEvent<QuestionCorrectPayload>): Promise<void> {
  const { userId, questionAttemptId, questionId } = event.payload;
  await awardGamificationEvent({
    userId,
    type: "QUESTION_CORRECT",
    sourceType: "QUESTION_ATTEMPT",
    sourceId: questionAttemptId,
    idempotencyKey: event.idempotencyKey,
    reason: `Questão correta: ${questionId}`,
    now: event.occurredAt,
  });
  await syncAchievementsForUser(userId, event.occurredAt);
}

/** TODO(Fase 11/12 — plano de estudos/study-tracking): sem emissor ainda; pronto para ser ligado. */
export async function handleDailyGoalCompleted(event: DomainEvent<DailyGoalCompletedPayload>): Promise<void> {
  const { userId, dailyGoalId, date } = event.payload;
  await awardGamificationEvent({
    userId,
    type: "DAILY_GOAL_COMPLETED",
    sourceType: "DAILY_GOAL",
    sourceId: dailyGoalId,
    idempotencyKey: event.idempotencyKey,
    reason: `Meta diária concluída: ${date}`,
    now: event.occurredAt,
  });
  await syncAchievementsForUser(userId, event.occurredAt);
}

/** TODO(Fase 11/12 — plano de estudos/study-tracking): sem emissor ainda; pronto para ser ligado. */
export async function handleWeeklyGoalCompleted(event: DomainEvent<WeeklyGoalCompletedPayload>): Promise<void> {
  const { userId, weeklyGoalId, weekStart } = event.payload;
  await awardGamificationEvent({
    userId,
    type: "WEEKLY_GOAL_COMPLETED",
    sourceType: "WEEKLY_GOAL",
    sourceId: weeklyGoalId,
    idempotencyKey: event.idempotencyKey,
    reason: `Meta semanal concluída: ${weekStart}`,
    now: event.occurredAt,
  });
  await syncAchievementsForUser(userId, event.occurredAt);
}

/** TODO(Fase 12 — study-tracking/`UserStreak`): sem emissor ainda; pronto para ser ligado. */
export async function handleStreakReached(event: DomainEvent<StreakReachedPayload>): Promise<void> {
  const { userId, milestone } = event.payload;
  const type = milestone === 30 ? "STREAK_30" : "STREAK_7";
  await awardGamificationEvent({
    userId,
    type,
    sourceType: "USER_STREAK",
    sourceId: String(milestone),
    idempotencyKey: event.idempotencyKey,
    reason: `Sequência de ${milestone} dias`,
    now: event.occurredAt,
  });
  await syncAchievementsForUser(userId, event.occurredAt);
}
