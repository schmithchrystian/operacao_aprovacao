import { mockCourses } from "@/mocks";
import type { CourseEntity, CourseRepository } from "../contracts/course-repository";

/** Implementação mock — lê de `src/mocks/data/courses.ts` (ADR-0011). */
export class MockCourseRepository implements CourseRepository {
  async findById(id: string): Promise<CourseEntity | null> {
    return mockCourses.find((course) => course.id === id) ?? null;
  }

  async findBySlug(slug: string): Promise<CourseEntity | null> {
    return mockCourses.find((course) => course.slug === slug) ?? null;
  }

  async list(): Promise<CourseEntity[]> {
    return [...mockCourses];
  }

  async listByContestId(contestId: string): Promise<CourseEntity[]> {
    return mockCourses.filter((course) => course.contestId === contestId);
  }
}
