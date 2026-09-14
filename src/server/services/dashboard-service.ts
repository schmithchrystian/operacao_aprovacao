import { env } from "@/config/env";
import { getPersistentDashboardData } from "./dashboard-persistence";
import type { DashboardGoal } from "@/contracts/dashboard";
import {
  mockNextLessons,
  mockPerformanceSummaries,
  mockRankings,
  mockSelectedContests,
  mockStudyStats,
} from "@/mocks";
import { assertOwnership, requireUser } from "@/server/authorization";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { getUserGamification } from "@/server/services/gamification";
import {
  recalculateDailyGoal,
  recalculateWeeklyGoal,
  recalculateStreak,
} from "@/server/services/study-tracking";
import type { DashboardDTO } from "@/contracts/dashboard";

/** Agrega o painel autorizado; dados demonstrativos são exclusivos de DATA_SOURCE=mock. */
interface GoalLike {
  targetMinutes: number | null;
  targetPoints: number | null;
  progressMinutes: number;
  progressPoints: number;
  achieved: boolean;
}

/** Mapeia o resultado real de `recalculateDailyGoal`/`recalculateWeeklyGoal` para
 *  `DashboardGoal` (contrato já existente da Fase 5) — prioriza a dimensão de PONTOS (default
 *  configurado, `STUDY_TRACKING_OVERVIEW.dailyGoalTargetPoints`/`weeklyGoalTargetPoints`) e só
 *  cai para minutos quando não há alvo de pontos definido. */
function toDashboardGoal(goal: GoalLike, periodDescription: string): DashboardGoal {
  const usesPoints = goal.targetPoints !== null;
  const target = usesPoints ? goal.targetPoints! : (goal.targetMinutes ?? 0);
  const progress = usesPoints ? goal.progressPoints : goal.progressMinutes;
  const unit = usesPoints ? "pontos" : "minutos";

  return {
    description: `Conquiste ${target} ${unit} ${periodDescription}`,
    target,
    progress,
    unit,
    completed: goal.achieved,
  };
}

export async function getStudentDashboard(userId: string): Promise<DashboardDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const user = await repos.users.findById(userId);
  if (!user) {
    throw new NotFoundError("Aluno não encontrado.");
  }

  const persistent = env.DATA_SOURCE === "prisma" ? await getPersistentDashboardData(userId) : null;
  const study = persistent?.study ?? mockStudyStats[userId];
  const performanceSummary = persistent?.performanceSummary ?? mockPerformanceSummaries[userId];
  const ranking = persistent ? persistent.ranking : mockRankings[userId];
  const contest = persistent ? persistent.contest : mockSelectedContests[userId];

  if (!study || !performanceSummary) {
    throw new NotFoundError("Dados de dashboard indisponíveis para este aluno.");
  }

  // Fonte real de pontos/XP/nível/conquistas (Fase 8). `getUserGamification` já reaplica
  // `requireUser`/`assertOwnership`; chamado depois da checagem já feita no topo desta função
  // (redundante, mas seguro e barato).
  const gamification = await getUserGamification(userId);

  // Fonte real de sequência/metas (Fase 12) — recalcula e persiste a partir de
  // `StudySession`/`PointTransaction` (nunca `Date.now()` aqui; `now` é a única leitura do
  // relógio real desta função, injetada explicitamente nos três serviços).
  const now = new Date();
  const [streak, dailyGoal, weeklyGoal] = await Promise.all([
    recalculateStreak(userId, now),
    recalculateDailyGoal(userId, now),
    recalculateWeeklyGoal(userId, now),
  ]);

  const nextLessonEntity = persistent ? null : mockNextLessons[userId];
  let nextLesson: DashboardDTO["nextLesson"] = persistent?.nextLesson ?? null;
  if (nextLessonEntity) {
    const course = await repos.courses.findById(nextLessonEntity.courseId);
    nextLesson = {
      courseId: nextLessonEntity.courseId,
      courseTitle: course?.title ?? nextLessonEntity.moduleTitle,
      moduleTitle: nextLessonEntity.moduleTitle,
      lessonId: nextLessonEntity.lessonId,
      lessonTitle: nextLessonEntity.lessonTitle,
      progressPercent: nextLessonEntity.progressPercent,
      href: nextLessonEntity.href,
    };
  }

  // Conquistas desbloqueadas (ledger real), mais recentes primeiro — só as `unlocked`.
  const recentAchievements = gamification.achievements
    .filter((achievement) => achievement.unlocked && achievement.unlockedAt !== null)
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))
    .slice(0, 5)
    .map((achievement) => ({
      id: achievement.key,
      name: achievement.name,
      icon: achievement.icon,
      achievedAt: achievement.unlockedAt as string,
    }));

  return {
    identity: {
      studentName: user.name,
      selectedContestId: contest?.contestId ?? null,
      selectedContestName: contest?.contestName ?? null,
    },
    gamification: {
      level: { index: gamification.level.level.index, name: gamification.level.level.name },
      points: gamification.points,
      xp: gamification.xp,
      currentLevelXp: gamification.level.currentLevelXp,
      nextLevelXp: gamification.level.nextLevelXp,
      streakDays: streak.currentStreak,
    },
    study: {
      weeklyStudyMinutes: study.weeklyStudyMinutes,
      lessonsCompleted: study.lessonsCompleted,
      mockExamsTaken: study.mockExamsTaken,
      accuracyPercent: study.accuracyPercent,
    },
    ranking: ranking
      ? {
          position: ranking.position,
          totalParticipants: ranking.totalParticipants,
          contestId: ranking.contestId,
        }
      : null,
    nextLesson,
    goals: {
      daily: toDashboardGoal(dailyGoal, "estudando hoje"),
      weekly: toDashboardGoal(weeklyGoal, "essa semana"),
    },
    performanceSummary,
    studyHoursSeries: study.studyHoursSeries,
    subjectPerformance: study.subjectPerformance,
    recentAchievements,
  };
}
