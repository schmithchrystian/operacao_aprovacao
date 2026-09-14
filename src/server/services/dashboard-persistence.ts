import { buildLessonHref } from "@/lib/routes";
import type { DashboardDTO, DashboardWeekday } from "@/contracts/dashboard";
import { getRepositories } from "@/server/repositories";
import { getTrackingOverview } from "./study-tracking/tracking-overview";
import { getUserRankingPosition } from "./gamification/ranking/read";
import { listUserActivitySamples } from "./study-tracking/activity-samples";
import {
  DEFAULT_TIMEZONE,
  sumValidSecondsByDate,
  toCalendarDateIso,
} from "./study-tracking/activity-days";
import { addDaysIso, weekStartIso } from "./study-plan/date-utils";
import { computeProgressForCourse } from "./courses/shared";

/** Internal aggregation: caller has already authorized the requested owner. */
export async function getPersistentDashboardData(userId: string) {
  const repos = getRepositories();
  const now = new Date();
  const [overview, profile, enrollments, attempts, samples] = await Promise.all([
    getTrackingOverview(userId, now),
    repos.profiles.findByUserId(userId),
    repos.enrollments.listByUserId(userId),
    repos.mockExamAttempts.listByUserId(userId),
    listUserActivitySamples(userId),
  ]);
  const target = profile?.targetContestId
    ? await repos.contests.findById(profile.targetContestId)
    : null;
  const contest = target ? { contestId: target.id, contestName: target.name } : null;
  const position = target
    ? await getUserRankingPosition(userId, { scopeType: "CONTEST", scopeKeyRaw: target.id })
    : null;
  const ranking =
    position && target
      ? {
          position: position.position,
          totalParticipants: position.totalParticipants,
          contestId: target.id,
        }
      : null;
  let nextLesson: DashboardDTO["nextLesson"] = null;
  for (const enrollment of enrollments) {
    if (enrollment.status === "cancelled") continue;
    const course = await repos.courses.findById(enrollment.courseId);
    if (!course || course.status !== "PUBLISHED" || course.deletedAt) continue;
    const progress = await computeProgressForCourse(userId, course.id);
    const resume = progress.resumeLesson;
    if (!resume) continue;
    const courseModule = progress.modules.find((row) => row.module.id === resume.moduleId)?.module;
    if (!courseModule) continue;
    nextLesson = {
      courseId: course.id,
      courseTitle: course.title,
      moduleTitle: courseModule.title,
      lessonId: resume.lesson.id,
      lessonTitle: resume.lesson.title,
      progressPercent: progress.courseProgressPercent,
      href: buildLessonHref({
        courseSlug: course.slug,
        moduleSlug: courseModule.slug,
        lessonId: resume.lesson.id,
      }),
    };
    break;
  }
  const seconds = sumValidSecondsByDate(samples, DEFAULT_TIMEZONE);
  const start = weekStartIso(toCalendarDateIso(now.toISOString(), DEFAULT_TIMEZONE));
  const weekdays: DashboardWeekday[] = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
  return {
    contest,
    ranking,
    nextLesson,
    study: {
      weeklyStudyMinutes: overview.hours.weekMinutes,
      lessonsCompleted: overview.lessonsCompleted,
      mockExamsTaken: attempts.filter((row) => row.status === "FINISHED").length,
      accuracyPercent: overview.questions.accuracyPercent,
      studyHoursSeries: weekdays.map((weekday, index) => ({
        weekday,
        minutes: Math.floor((seconds.get(addDaysIso(start, index)) ?? 0) / 60),
      })),
      subjectPerformance: overview.subjectPerformance.map((row) => ({
        subject: row.subjectName,
        accuracyPercent: row.accuracyPercent,
      })),
    },
    performanceSummary: {
      totalPointsThisWeek: overview.weeklyGoal.progressPoints,
      accuracyTrend: "stable" as const,
      highlight:
        overview.questions.totalAnswered === 0
          ? "Responda questões para acompanhar seu desempenho."
          : `Você respondeu ${overview.questions.totalAnswered} questões, com ${Math.round(overview.questions.accuracyPercent)}% de acertos.`,
    },
  };
}
