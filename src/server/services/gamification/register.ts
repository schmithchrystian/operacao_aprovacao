import { eventBus } from "@/server/events";
import {
  handleCourseCompleted,
  handleDailyGoalCompleted,
  handleFlashcardCorrect,
  handleLessonCompleted,
  handleModuleCompleted,
  handleMockExamCompleted,
  handlePomodoroCompleted,
  handleQuestionCorrect,
  handleStreakReached,
  handleWeeklyGoalCompleted,
} from "./handlers";
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
 * Bootstrap central de registro dos consumidores de gamificação (Fase 8 — substitui o
 * registro disperso da Fase 7, que era chamado como side-effect de import dentro do próprio
 * `study-tracking/record-heartbeat.ts`). Idempotente por processo — chamadas repetidas (hot
 * reload em dev, múltiplos imports) não duplicam a inscrição de nenhum handler no
 * `InMemoryEventBus`, o que evitaria conceder pontos duas vezes numa única emissão.
 */
let registered = false;

export function registerGamificationEventHandlers(): void {
  if (registered) {
    return;
  }

  eventBus.subscribe<LessonCompletedPayload>("LessonCompleted", handleLessonCompleted);
  eventBus.subscribe<ModuleCompletedPayload>("ModuleCompleted", handleModuleCompleted);
  eventBus.subscribe<CourseCompletedPayload>("CourseCompleted", handleCourseCompleted);
  eventBus.subscribe<MockExamCompletedPayload>("MockExamCompleted", handleMockExamCompleted);
  eventBus.subscribe<QuestionCorrectPayload>("QuestionCorrect", handleQuestionCorrect);
  // Emissores reais na Fase 12 (`study-tracking/goals.ts`/`streak.ts`).
  eventBus.subscribe<DailyGoalCompletedPayload>("DailyGoalCompleted", handleDailyGoalCompleted);
  eventBus.subscribe<WeeklyGoalCompletedPayload>("WeeklyGoalCompleted", handleWeeklyGoalCompleted);
  eventBus.subscribe<StreakReachedPayload>("StreakReached", handleStreakReached);
  // Os dois handlers abaixo estão prontos (tipagem + lógica de premiação), mas nenhum emissor
  // real existe ainda — registrá-los é inofensivo e evita esquecer a assinatura quando a fase
  // dona implementar a emissão (ver TODO em `./events.ts`).
  eventBus.subscribe<FlashcardCorrectPayload>("FlashcardCorrect", handleFlashcardCorrect);
  eventBus.subscribe<PomodoroCompletedPayload>("PomodoroCompleted", handlePomodoroCompleted);

  registered = true;
}

/** Uso exclusivo de testes — permite re-registrar após resetar o estado do módulo. */
export function __resetGamificationRegistration(): void {
  registered = false;
}
