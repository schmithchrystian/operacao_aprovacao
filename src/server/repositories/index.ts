import { env } from "@/config/env";
import type {
  CourseRepository,
  EnrollmentRepository,
  LessonProgressRepository,
  LessonRepository,
  ModuleRepository,
  SubjectRepository,
  UserRepository,
} from "./contracts";
import { MockCourseRepository } from "./mock/course-repository";
import { MockEnrollmentRepository } from "./mock/enrollment-repository";
import { MockLessonProgressRepository } from "./mock/lesson-progress-repository";
import { MockLessonRepository } from "./mock/lesson-repository";
import { MockModuleRepository } from "./mock/module-repository";
import { MockSubjectRepository } from "./mock/subject-repository";
import { MockUserRepository } from "./mock/user-repository";
import { PrismaCourseRepository } from "./prisma/course-repository";
import { PrismaEnrollmentRepository } from "./prisma/enrollment-repository";
import { PrismaLessonProgressRepository } from "./prisma/lesson-progress-repository";
import { PrismaLessonRepository } from "./prisma/lesson-repository";
import { PrismaModuleRepository } from "./prisma/module-repository";
import { PrismaSubjectRepository } from "./prisma/subject-repository";
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
  };
}

/** Retorna o container de repositórios (memoizado por processo). Services devem depender só disso. */
export function getRepositories(): Repositories {
  cached ??= buildRepositories();
  return cached;
}

export * from "./contracts";
