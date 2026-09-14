import { env } from "@/config/env";
import { mockRankingParticipants, type RankingParticipantEntity } from "@/mocks";
import { getRepositories } from "@/server/repositories";

/** One row per active enrollment; scope selection deduplicates users before scoring. */
export async function loadRankingParticipants(): Promise<RankingParticipantEntity[]> {
  if (env.DATA_SOURCE === "mock") return mockRankingParticipants;
  const repos = getRepositories();
  const users = (await repos.users.list()).filter(user => user.isActive && !user.deletedAt && user.role === "aluno");
  const profiles = new Map((await repos.profiles.findByUserIds(users.map(user => user.id))).map(profile => [profile.userId, profile]));
  const rows = await Promise.all(users.map(async user => {
    const profile = profiles.get(user.id);
    const enrollments = (await repos.enrollments.listByUserId(user.id)).filter(enrollment => enrollment.status !== "cancelled");
    const courses = (await Promise.all(enrollments.map(enrollment => repos.courses.findById(enrollment.courseId))))
      .filter(course => course && course.status === "PUBLISHED" && !course.deletedAt);
    return (courses.length ? courses : [null]).map(course => ({
      userId: user.id, displayName: user.name, avatarUrl: profile?.avatarUrl ?? null,
      city: profile?.city ?? null, state: profile?.state ?? null,
      contestId: course?.contestId ?? profile?.targetContestId ?? null,
      contestName: course?.contestName ?? null, courseId: course?.id ?? null,
      isProfilePublic: profile?.isProfilePublic ?? false, showInRanking: profile?.showInRanking ?? false,
      showRealName: profile?.showRealName ?? false, showCityState: profile?.showCityState ?? false,
      mockExamAccuracyPercent: 0, mockGoalsCompletedCount: 0,
      fallbackLessonsCompleted: 0, fallbackValidHours: 0, fallbackConsistency: 0, fallbackPoints: 0,
      firstActivityAt: user.createdAt, lastActivityAt: user.createdAt,
    }));
  }));
  return rows.flat();
}
