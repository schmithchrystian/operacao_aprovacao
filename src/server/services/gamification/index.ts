export {
  handleLessonCompleted,
  registerGamificationEventHandlers,
  type LessonCompletedPayload,
} from "./award-on-lesson-completed";
export {
  findPointTransactionByIdempotencyKey,
  listGamificationEventsByUserId,
  listPointTransactionsByUserId,
  recordLessonCompletedAward,
  __resetGamificationMockStore,
  type GamificationEventRecord,
  type PointTransactionRecord,
} from "./store";
