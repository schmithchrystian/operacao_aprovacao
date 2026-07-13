import { env } from "@/config/env";
import type { CourseRepository, UserRepository } from "./contracts";
import { MockCourseRepository } from "./mock/course-repository";
import { MockUserRepository } from "./mock/user-repository";
import { PrismaCourseRepository } from "./prisma/course-repository";
import { PrismaUserRepository } from "./prisma/user-repository";

/** Container de repositórios do processo, selecionado por `DATA_SOURCE` (ADR-0002). */
export interface Repositories {
  users: UserRepository;
  courses: CourseRepository;
}

let cached: Repositories | null = null;

function buildRepositories(): Repositories {
  if (env.DATA_SOURCE === "prisma") {
    return { users: new PrismaUserRepository(), courses: new PrismaCourseRepository() };
  }
  return { users: new MockUserRepository(), courses: new MockCourseRepository() };
}

/** Retorna o container de repositórios (memoizado por processo). Services devem depender só disso. */
export function getRepositories(): Repositories {
  cached ??= buildRepositories();
  return cached;
}

export * from "./contracts";
