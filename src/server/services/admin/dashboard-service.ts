import type { AdminDashboardDTO } from "@/contracts/admin-dashboard";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { getRepositories } from "@/server/repositories";
import { CONTENT_MANAGE_ROLES } from "./roles";

/**
 * Dashboard administrativo (Fase 17 — "moderador pode... ver dashboard", agente `backend`).
 * Agrega métricas REAIS a partir dos repositórios já existentes — nenhum valor é uma segunda
 * fonte de verdade paralela. Ver PENDÊNCIAS explícitas em `@/contracts/admin-dashboard.ts`
 * (`activeSubscriptions` mock/derivado, `engagementScore` heurística).
 *
 * Implementação por ITERAÇÃO sobre `users.list()` (poucos usuários no mock) — uma implementação
 * Prisma real deve substituir isto por consultas agregadas (`GROUP BY`/`COUNT`) em vez de N+1;
 * documentado aqui e não corrigido porque TODOS os repositórios Prisma deste projeto ainda são
 * stubs "not implemented" (fase de banco).
 */

const EPOCH_ISO = "1970-01-01T00:00:00.000Z";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TOP_N = 5;

function topEntries(counts: Map<string, number>, limit: number): Array<[string, number]> {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export const getAdminDashboard = withAdminAudit(
  { operation: "admin.dashboard.read", entity: "Dashboard", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, now: Date): Promise<AdminDashboardDTO> => {
    const repos = getRepositories();
    const users = await repos.users.list();
    const students = users.filter((user) => user.role === "aluno");

    const thirtyDaysAgoIso = new Date(now.getTime() - THIRTY_DAYS_MS).toISOString();
    const totalStudents = students.length;
    const activeUsers = users.filter((user) => user.isActive).length;
    const newUsersLast30Days = users.filter((user) => user.createdAt >= thirtyDaysAgoIso).length;

    let totalValidSeconds = 0;
    let activeStudentsInWindow = 0;
    let totalLessonProgressRecords = 0;
    let completedLessonProgressRecords = 0;
    let totalScoreSum = 0;
    let totalScoreCount = 0;
    const lessonViewCounts = new Map<string, number>();
    const mockExamAttemptCounts = new Map<string, number>();
    const courseEnrollmentCounts = new Map<string, number>();

    for (const student of students) {
      const [sessions, progresses, attempts, enrollments] = await Promise.all([
        repos.studySessions.listRecentSessionsByUserId(student.id, EPOCH_ISO),
        repos.lessonProgress.listByUserId(student.id),
        repos.mockExamAttempts.listByUserId(student.id),
        repos.enrollments.listByUserId(student.id),
      ]);

      totalValidSeconds += sessions.reduce((sum, session) => sum + session.validSeconds, 0);
      if (sessions.some((session) => session.lastHeartbeatAt >= thirtyDaysAgoIso)) {
        activeStudentsInWindow += 1;
      }

      totalLessonProgressRecords += progresses.length;
      for (const progress of progresses) {
        if (progress.status === "completed") completedLessonProgressRecords += 1;
        lessonViewCounts.set(progress.lessonId, (lessonViewCounts.get(progress.lessonId) ?? 0) + 1);
      }

      for (const attempt of attempts) {
        mockExamAttemptCounts.set(attempt.mockExamId, (mockExamAttemptCounts.get(attempt.mockExamId) ?? 0) + 1);
        if (attempt.status === "FINISHED" && attempt.scorePercent !== null) {
          totalScoreSum += attempt.scorePercent;
          totalScoreCount += 1;
        }
      }

      for (const enrollment of enrollments) {
        courseEnrollmentCounts.set(enrollment.courseId, (courseEnrollmentCounts.get(enrollment.courseId) ?? 0) + 1);
      }
    }

    const [courses, lessonEntries, mockExamEntries] = await Promise.all([
      repos.courses.listForAdmin(),
      Promise.all(topEntries(lessonViewCounts, TOP_N).map(async ([lessonId, count]) => {
        const lesson = await repos.lessons.findById(lessonId);
        return { lessonId, title: lesson?.title ?? lessonId, viewCount: count };
      })),
      Promise.all(topEntries(mockExamAttemptCounts, TOP_N).map(async ([mockExamId, count]) => {
        const exam = await repos.mockExams.findById(mockExamId);
        return { mockExamId, title: exam?.title ?? mockExamId, attemptCount: count };
      })),
    ]);

    const courseTitleById = new Map(courses.map((course) => [course.id, course.title]));
    const topCourses = topEntries(courseEnrollmentCounts, TOP_N).map(([courseId, count]) => ({
      courseId,
      title: courseTitleById.get(courseId) ?? courseId,
      accessCount: count,
    }));

    const completionRatePercent =
      totalLessonProgressRecords > 0 ? (completedLessonProgressRecords / totalLessonProgressRecords) * 100 : 0;
    const averagePerformancePercent = totalScoreCount > 0 ? totalScoreSum / totalScoreCount : 0;
    const retentionRatePercent = totalStudents > 0 ? (activeStudentsInWindow / totalStudents) * 100 : 0;
    // Heurística simples (ver PENDÊNCIA no contrato) — média de conclusão e retenção.
    const engagementScore = (completionRatePercent + retentionRatePercent) / 2;
    const averageStudyMinutesPerStudent = totalStudents > 0 ? totalValidSeconds / 60 / totalStudents : 0;

    return {
      totalStudents,
      activeUsers,
      newUsersLast30Days,
      averageStudyMinutesPerStudent,
      completionRatePercent,
      averagePerformancePercent,
      retentionRatePercent,
      engagementScore,
      topCourses,
      topLessons: lessonEntries,
      topMockExams: mockExamEntries,
      // TODO — sem `SubscriptionRepository` ainda (ver PENDÊNCIA no contrato).
      activeSubscriptions: 0,
      generatedAt: now.toISOString(),
    };
  },
);
