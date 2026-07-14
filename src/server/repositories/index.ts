import { env } from "@/config/env";
import type {
  CourseRepository,
  EnrollmentRepository,
  GamificationEventRepository,
  LessonProgressRepository,
  LessonRepository,
  ModuleRepository,
  PointTransactionRepository,
  StudySessionRepository,
  SubjectRepository,
  UserAchievementRepository,
  UserRepository,
} from "./contracts";
import { MockCourseRepository } from "./mock/course-repository";
import { MockEnrollmentRepository } from "./mock/enrollment-repository";
import { MockGamificationEventRepository } from "./mock/gamification-event-repository";
import { MockLessonProgressRepository } from "./mock/lesson-progress-repository";
import { MockLessonRepository } from "./mock/lesson-repository";
import { MockModuleRepository } from "./mock/module-repository";
import { MockPointTransactionRepository } from "./mock/point-transaction-repository";
import { MockStudySessionRepository } from "./mock/study-session-repository";
import { MockSubjectRepository } from "./mock/subject-repository";
import { MockUserAchievementRepository } from "./mock/user-achievement-repository";
import { MockUserRepository } from "./mock/user-repository";
import { PrismaCourseRepository } from "./prisma/course-repository";
import { PrismaEnrollmentRepository } from "./prisma/enrollment-repository";
import { PrismaGamificationEventRepository } from "./prisma/gamification-event-repository";
import { PrismaLessonProgressRepository } from "./prisma/lesson-progress-repository";
import { PrismaLessonRepository } from "./prisma/lesson-repository";
import { PrismaModuleRepository } from "./prisma/module-repository";
import { PrismaPointTransactionRepository } from "./prisma/point-transaction-repository";
import { PrismaStudySessionRepository } from "./prisma/study-session-repository";
import { PrismaSubjectRepository } from "./prisma/subject-repository";
import { PrismaUserAchievementRepository } from "./prisma/user-achievement-repository";
import { PrismaUserRepository } from "./prisma/user-repository";

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
  };
}

/** Retorna o container de repositórios (memoizado por processo). Services devem depender só disso. */
export function getRepositories(): Repositories {
  cached ??= buildRepositories();
  return cached;
}

export * from "./contracts";
