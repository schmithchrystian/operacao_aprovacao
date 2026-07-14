// Motor de recompensa (idempotente, auditável — CLAUDE.md §15/§25).
export {
  awardGamificationEvent,
  computeReward,
  syncAchievementsForUser,
  type AwardGamificationEventInput,
  type AwardGamificationEventResult,
} from "./engine";

// Níveis (CLAUDE.md §16).
export { LEVELS, computeLevel, type LevelDefinition, type ComputedLevel } from "./levels";

// Conquistas (CLAUDE.md §15/§25).
export {
  ACHIEVEMENTS,
  evaluateAchievements,
  type AchievementDefinition,
  type UserGamificationStats,
} from "./achievements";

// Payloads de eventos de domínio + idempotência.
export {
  buildIdempotencyKey,
  type LessonCompletedPayload,
  type ModuleCompletedPayload,
  type CourseCompletedPayload,
  type FlashcardCorrectPayload,
  type PomodoroCompletedPayload,
  type MockExamCompletedPayload,
  type QuestionCorrectPayload,
  type DailyGoalCompletedPayload,
  type WeeklyGoalCompletedPayload,
  type StreakReachedPayload,
} from "./events";

// Handlers (registrados via `registerGamificationEventHandlers`).
export {
  handleLessonCompleted,
  handleModuleCompleted,
  handleCourseCompleted,
  handleFlashcardCorrect,
  handlePomodoroCompleted,
  handleMockExamCompleted,
  handleQuestionCorrect,
  handleDailyGoalCompleted,
  handleWeeklyGoalCompleted,
  handleStreakReached,
} from "./handlers";

export { registerGamificationEventHandlers, __resetGamificationRegistration } from "./register";

// Leitura agregada (dashboard/perfil).
export {
  getUserGamification,
  computeUserGamificationView,
  computeUserGamificationStats,
  type UserGamificationView,
  type UserAchievementView,
} from "./read";

// Ranking (Fase 9 — fórmula normalizada, escopos, materialização e leitura, CLAUDE.md §17).
export * from "./ranking";
