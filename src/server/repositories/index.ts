import { env } from "@/config/env";
import type {
  BrainstormBoardRepository,
  BrainstormCardRepository,
  BrainstormColumnRepository,
  CourseRepository,
  DailyGoalRepository,
  EnrollmentRepository,
  FlashcardDeckRepository,
  FlashcardRepository,
  FlashcardReviewRepository,
  GamificationEventRepository,
  LessonProgressRepository,
  LessonRepository,
  MockExamAttemptRepository,
  MockExamRepository,
  ModuleRepository,
  PointTransactionRepository,
  QuestionAttemptRepository,
  QuestionFavoriteRepository,
  QuestionOptionRepository,
  QuestionRepository,
  RankingScoreRepository,
  StudyMissionRepository,
  StudyPlanItemRepository,
  StudyPlanRepository,
  StudySessionRepository,
  SubjectRepository,
  TopicRepository,
  UserAchievementRepository,
  UserRepository,
  UserStreakRepository,
  WeeklyGoalRepository,
} from "./contracts";
import { MockBrainstormBoardRepository } from "./mock/brainstorm-board-repository";
import { MockBrainstormCardRepository } from "./mock/brainstorm-card-repository";
import { MockBrainstormColumnRepository } from "./mock/brainstorm-column-repository";
import { MockCourseRepository } from "./mock/course-repository";
import { MockDailyGoalRepository } from "./mock/daily-goal-repository";
import { MockEnrollmentRepository } from "./mock/enrollment-repository";
import { MockFlashcardDeckRepository } from "./mock/flashcard-deck-repository";
import { MockFlashcardRepository } from "./mock/flashcard-repository";
import { MockFlashcardReviewRepository } from "./mock/flashcard-review-repository";
import { MockGamificationEventRepository } from "./mock/gamification-event-repository";
import { MockLessonProgressRepository } from "./mock/lesson-progress-repository";
import { MockLessonRepository } from "./mock/lesson-repository";
import { MockMockExamAttemptRepository } from "./mock/mock-exam-attempt-repository";
import { MockMockExamRepository } from "./mock/mock-exam-repository";
import { MockModuleRepository } from "./mock/module-repository";
import { MockPointTransactionRepository } from "./mock/point-transaction-repository";
import { MockQuestionAttemptRepository } from "./mock/question-attempt-repository";
import { MockQuestionFavoriteRepository } from "./mock/question-favorite-repository";
import { MockQuestionOptionRepository } from "./mock/question-option-repository";
import { MockQuestionRepository } from "./mock/question-repository";
import { MockRankingScoreRepository } from "./mock/ranking-score-repository";
import { MockStudyMissionRepository } from "./mock/study-mission-repository";
import { MockStudyPlanItemRepository } from "./mock/study-plan-item-repository";
import { MockStudyPlanRepository } from "./mock/study-plan-repository";
import { MockStudySessionRepository } from "./mock/study-session-repository";
import { MockSubjectRepository } from "./mock/subject-repository";
import { MockTopicRepository } from "./mock/topic-repository";
import { MockUserAchievementRepository } from "./mock/user-achievement-repository";
import { MockUserRepository } from "./mock/user-repository";
import { MockUserStreakRepository } from "./mock/user-streak-repository";
import { MockWeeklyGoalRepository } from "./mock/weekly-goal-repository";
import { PrismaBrainstormBoardRepository } from "./prisma/brainstorm-board-repository";
import { PrismaBrainstormCardRepository } from "./prisma/brainstorm-card-repository";
import { PrismaBrainstormColumnRepository } from "./prisma/brainstorm-column-repository";
import { PrismaCourseRepository } from "./prisma/course-repository";
import { PrismaDailyGoalRepository } from "./prisma/daily-goal-repository";
import { PrismaEnrollmentRepository } from "./prisma/enrollment-repository";
import { PrismaFlashcardDeckRepository } from "./prisma/flashcard-deck-repository";
import { PrismaFlashcardRepository } from "./prisma/flashcard-repository";
import { PrismaFlashcardReviewRepository } from "./prisma/flashcard-review-repository";
import { PrismaGamificationEventRepository } from "./prisma/gamification-event-repository";
import { PrismaLessonProgressRepository } from "./prisma/lesson-progress-repository";
import { PrismaLessonRepository } from "./prisma/lesson-repository";
import { PrismaMockExamAttemptRepository } from "./prisma/mock-exam-attempt-repository";
import { PrismaMockExamRepository } from "./prisma/mock-exam-repository";
import { PrismaModuleRepository } from "./prisma/module-repository";
import { PrismaPointTransactionRepository } from "./prisma/point-transaction-repository";
import { PrismaQuestionAttemptRepository } from "./prisma/question-attempt-repository";
import { PrismaQuestionFavoriteRepository } from "./prisma/question-favorite-repository";
import { PrismaQuestionOptionRepository } from "./prisma/question-option-repository";
import { PrismaQuestionRepository } from "./prisma/question-repository";
import { PrismaRankingScoreRepository } from "./prisma/ranking-score-repository";
import { PrismaStudyMissionRepository } from "./prisma/study-mission-repository";
import { PrismaStudyPlanItemRepository } from "./prisma/study-plan-item-repository";
import { PrismaStudyPlanRepository } from "./prisma/study-plan-repository";
import { PrismaStudySessionRepository } from "./prisma/study-session-repository";
import { PrismaSubjectRepository } from "./prisma/subject-repository";
import { PrismaTopicRepository } from "./prisma/topic-repository";
import { PrismaUserAchievementRepository } from "./prisma/user-achievement-repository";
import { PrismaUserRepository } from "./prisma/user-repository";
import { PrismaUserStreakRepository } from "./prisma/user-streak-repository";
import { PrismaWeeklyGoalRepository } from "./prisma/weekly-goal-repository";

/** Container de repositórios do processo, selecionado por `DATA_SOURCE` (ADR-0002). */
export interface Repositories {
  users: UserRepository;
  courses: CourseRepository;
  modules: ModuleRepository;
  lessons: LessonRepository;
  subjects: SubjectRepository;
  enrollments: EnrollmentRepository;
  lessonProgress: LessonProgressRepository;
  studySessions: StudySessionRepository;
  gamificationEvents: GamificationEventRepository;
  pointTransactions: PointTransactionRepository;
  userAchievements: UserAchievementRepository;
  rankingScores: RankingScoreRepository;
  /** Fase 10 — agente `simulations` (docs/DATA-MODEL.md, "Simulados e questões"). */
  topics: TopicRepository;
  questions: QuestionRepository;
  questionOptions: QuestionOptionRepository;
  mockExams: MockExamRepository;
  mockExamAttempts: MockExamAttemptRepository;
  questionAttempts: QuestionAttemptRepository;
  questionFavorites: QuestionFavoriteRepository;
  /** Fase 11 — agente `study-tracking` ("Montar estudo" + "Plano de estudos"). */
  studyPlans: StudyPlanRepository;
  studyPlanItems: StudyPlanItemRepository;
  studyMissions: StudyMissionRepository;
  /** Fase 12 — agente `study-tracking` (acompanhamento: sequência + metas). */
  userStreaks: UserStreakRepository;
  dailyGoals: DailyGoalRepository;
  weeklyGoals: WeeklyGoalRepository;
  /** Fase 13 — agente `backend` (Brainstorm: quadros Kanban). */
  brainstormBoards: BrainstormBoardRepository;
  brainstormColumns: BrainstormColumnRepository;
  brainstormCards: BrainstormCardRepository;
  /** Fase 14 — agente `backend` (Flashcards: repetição espaçada). */
  flashcardDecks: FlashcardDeckRepository;
  flashcards: FlashcardRepository;
  flashcardReviews: FlashcardReviewRepository;
}

let cached: Repositories | null = null;

function buildRepositories(): Repositories {
  if (env.DATA_SOURCE === "prisma") {
    return {
      users: new PrismaUserRepository(),
      courses: new PrismaCourseRepository(),
      modules: new PrismaModuleRepository(),
      lessons: new PrismaLessonRepository(),
      subjects: new PrismaSubjectRepository(),
      enrollments: new PrismaEnrollmentRepository(),
      lessonProgress: new PrismaLessonProgressRepository(),
      studySessions: new PrismaStudySessionRepository(),
      gamificationEvents: new PrismaGamificationEventRepository(),
      pointTransactions: new PrismaPointTransactionRepository(),
      userAchievements: new PrismaUserAchievementRepository(),
      rankingScores: new PrismaRankingScoreRepository(),
      topics: new PrismaTopicRepository(),
      questions: new PrismaQuestionRepository(),
      questionOptions: new PrismaQuestionOptionRepository(),
      mockExams: new PrismaMockExamRepository(),
      mockExamAttempts: new PrismaMockExamAttemptRepository(),
      questionAttempts: new PrismaQuestionAttemptRepository(),
      questionFavorites: new PrismaQuestionFavoriteRepository(),
      studyPlans: new PrismaStudyPlanRepository(),
      studyPlanItems: new PrismaStudyPlanItemRepository(),
      studyMissions: new PrismaStudyMissionRepository(),
      userStreaks: new PrismaUserStreakRepository(),
      dailyGoals: new PrismaDailyGoalRepository(),
      weeklyGoals: new PrismaWeeklyGoalRepository(),
      brainstormBoards: new PrismaBrainstormBoardRepository(),
      brainstormColumns: new PrismaBrainstormColumnRepository(),
      brainstormCards: new PrismaBrainstormCardRepository(),
      flashcardDecks: new PrismaFlashcardDeckRepository(),
      flashcards: new PrismaFlashcardRepository(),
      flashcardReviews: new PrismaFlashcardReviewRepository(),
    };
  }
  return {
    users: new MockUserRepository(),
    courses: new MockCourseRepository(),
    modules: new MockModuleRepository(),
    lessons: new MockLessonRepository(),
    subjects: new MockSubjectRepository(),
    enrollments: new MockEnrollmentRepository(),
    lessonProgress: new MockLessonProgressRepository(),
    studySessions: new MockStudySessionRepository(),
    gamificationEvents: new MockGamificationEventRepository(),
    pointTransactions: new MockPointTransactionRepository(),
    userAchievements: new MockUserAchievementRepository(),
    rankingScores: new MockRankingScoreRepository(),
    topics: new MockTopicRepository(),
    questions: new MockQuestionRepository(),
    questionOptions: new MockQuestionOptionRepository(),
    mockExams: new MockMockExamRepository(),
    mockExamAttempts: new MockMockExamAttemptRepository(),
    questionAttempts: new MockQuestionAttemptRepository(),
    questionFavorites: new MockQuestionFavoriteRepository(),
    studyPlans: new MockStudyPlanRepository(),
    studyPlanItems: new MockStudyPlanItemRepository(),
    studyMissions: new MockStudyMissionRepository(),
    userStreaks: new MockUserStreakRepository(),
    dailyGoals: new MockDailyGoalRepository(),
    weeklyGoals: new MockWeeklyGoalRepository(),
    brainstormBoards: new MockBrainstormBoardRepository(),
    brainstormColumns: new MockBrainstormColumnRepository(),
    brainstormCards: new MockBrainstormCardRepository(),
    flashcardDecks: new MockFlashcardDeckRepository(),
    flashcards: new MockFlashcardRepository(),
    flashcardReviews: new MockFlashcardReviewRepository(),
  };
}

/** Retorna o container de repositórios (memoizado por processo). Services devem depender só disso. */
export function getRepositories(): Repositories {
  cached ??= buildRepositories();
  return cached;
}

export * from "./contracts";
