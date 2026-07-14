import { assertOwnership, requireUser } from "@/server/authorization";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { getUserGamification } from "@/server/services/gamification";
import {
  mockGamificationStates,
  mockGoals,
  mockNextLessons,
  mockPerformanceSummaries,
  mockRankings,
  mockSelectedContests,
  mockStudyStats,
} from "@/mocks";
import type { DashboardDTO } from "@/contracts/dashboard";

/**
 * Serviço de agregação de leitura do dashboard do aluno (Fase 5 — backend/leitura).
 *
 * Este serviço SÓ agrega: junta o usuário autenticado (`UserRepository`), o curso da
 * próxima aula recomendada (`CourseRepository`) e os estados pré-computados em
 * `src/mocks/data/dashboard-*`, devolvendo o `DashboardDTO` já pronto para a UI.
 *
 * Nenhuma regra de pontos/XP/nível/tempo válido/sequência é calculada aqui:
 * - Pontos, XP, nível e conquistas vêm do motor de gamificação real (Fase 8,
 *   `@/server/services/gamification`), lido a partir de `PointTransaction`/`UserAchievement`
 *   (ledger auditável) — não são mais literais fixos. `streakDays` continua vindo do mock
 *   (`mockGamificationStates`) porque sua fonte definitiva é `UserStreak`, de propriedade do
 *   agente `study-tracking` (Fase 12), fora do escopo de `gamification`.
 * - TODO(Fase 9 — agente `gamification`): ranking ainda não implementado.
 * - TODO(Fase 12 — agente `study-tracking`): tempo estudado, aulas concluídas, simulados,
 *   percentual de acertos e metas devem passar a vir do tempo válido real (heartbeat,
 *   sinais de atividade — CLAUDE.md §14), não da diferença simples entre início e fim.
 * - TODO(Fase 7 — cursos/concursos): `selectedContest` e a próxima aula recomendada
 *   (módulo/aula) devem passar a vir de repositórios reais de `Contest`/`Module`/`Lesson`
 *   quando existirem; hoje só `CourseRepository` existe.
 *
 * Autorização (ADR-0006, CLAUDE.md §11): quem chama só pode ler o próprio dashboard —
 * `requireUser` garante sessão real (nunca aceitar `userId` do corpo da requisição) e
 * `assertOwnership` impede que um usuário autenticado leia o dashboard de outro (anti-IDOR).
 */
export async function getStudentDashboard(userId: string): Promise<DashboardDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const user = await repos.users.findById(userId);
  if (!user) {
    throw new NotFoundError("Aluno não encontrado.");
  }

  const gamificationMock = mockGamificationStates[userId];
  const study = mockStudyStats[userId];
  const performanceSummary = mockPerformanceSummaries[userId];
  const goals = mockGoals[userId];
  const ranking = mockRankings[userId];
  const contest = mockSelectedContests[userId];

  if (!gamificationMock || !study || !performanceSummary || !goals || !ranking || !contest) {
    throw new NotFoundError("Dados de dashboard indisponíveis para este aluno.");
  }

  // Fonte real de pontos/XP/nível/conquistas (Fase 8) — `streakDays` permanece do mock (ver
  // nota acima). `getUserGamification` já reaplica `requireUser`/`assertOwnership`; chamado
  // depois da checagem já feita no topo desta função (redundante, mas seguro e barato).
  const gamification = await getUserGamification(userId);

  const nextLessonEntity = mockNextLessons[userId];
  let nextLesson: DashboardDTO["nextLesson"] = null;
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
      selectedContestId: contest.contestId,
      selectedContestName: contest.contestName,
    },
    gamification: {
      level: { index: gamification.level.level.index, name: gamification.level.level.name },
      points: gamification.points,
      xp: gamification.xp,
      currentLevelXp: gamification.level.currentLevelXp,
      nextLevelXp: gamification.level.nextLevelXp,
      streakDays: gamificationMock.streakDays,
    },
    study: {
      weeklyStudyMinutes: study.weeklyStudyMinutes,
      lessonsCompleted: study.lessonsCompleted,
      mockExamsTaken: study.mockExamsTaken,
      accuracyPercent: study.accuracyPercent,
    },
    ranking: {
      position: ranking.position,
      totalParticipants: ranking.totalParticipants,
      contestId: ranking.contestId,
    },
    nextLesson,
    goals,
    performanceSummary,
    studyHoursSeries: study.studyHoursSeries,
    subjectPerformance: study.subjectPerformance,
    recentAchievements,
  };
}
