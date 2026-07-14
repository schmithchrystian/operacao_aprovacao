import type { ProfileAggregatesDTO, ProfileContestSummaryDTO } from "@/contracts/profile";
import { computeUserGamificationStats, computeUserGamificationView, getUserRankingPosition } from "@/server/services/gamification";
import { getRepositories } from "@/server/repositories";
import type { ProfileEntity } from "@/server/repositories/contracts/profile-repository";

/**
 * Blocos de composição do domínio "Perfil" (Fase 16 — agente `backend`). Reaproveita serviços
 * JÁ EXISTENTES para os agregados — nunca recalcula regra que já é de outra fase (CLAUDE.md §6):
 * - nível/pontos/XP/conquistas: `computeUserGamificationView` (núcleo NÃO autorizado de
 *   `@/server/services/gamification/read.ts`, extraído nesta fase — ver docstring lá);
 * - aulas concluídas/simulados concluídos/horas de estudo/sequência:
 *   `computeUserGamificationStats` (mesmo módulo, já não-autorizado);
 * - posição no ranking: `getUserRankingPosition` (`@/server/services/gamification/ranking`,
 *   novo nesta fase — variante de leitura sem paginação/máscara, pensada para qualquer userId).
 *
 * Nenhuma função aqui chama `requireUser`/`assertOwnership` — são blocos internos consumidos
 * por `./read.ts`/`./update.ts`, que aplicam a própria autorização/privacidade na borda (mesmo
 * espírito de `ranking/metrics.ts#gatherRawMetrics`, que também lê repositórios diretamente
 * para QUALQUER participante).
 */

/** Média (0-100) de `scorePercent` entre os simulados FINALIZADOS do usuário — mesma fórmula de
 *  `ranking/metrics.ts#computeMockExamPerformance`, mas sem o fallback (aqui não existe
 *  "participante fictício": um usuário real sem simulado finalizado devolve `null`, mais
 *  honesto para uma tela de perfil do que emprestar um valor de demonstração). */
async function computeAverageMockExamScorePercent(userId: string): Promise<number | null> {
  const repos = getRepositories();
  const attempts = await repos.mockExamAttempts.listByUserId(userId);
  const finished = attempts.filter(
    (attempt): attempt is typeof attempt & { scorePercent: number } =>
      attempt.status === "FINISHED" && attempt.scorePercent !== null,
  );
  if (finished.length === 0) {
    return null;
  }
  const total = finished.reduce((sum, attempt) => sum + attempt.scorePercent, 0);
  return Math.round((total / finished.length) * 100) / 100;
}

/** Get-or-create idempotente: cria a linha com os defaults de privacidade (fail-closed —
 *  `isProfilePublic: false`) na PRIMEIRA vez que o dono acessa "Meu perfil"/atualiza alguma
 *  preferência. Nunca chamado a partir de uma leitura de TERCEIRO (`getPublicProfile` trata
 *  "sem Profile" como perfil fechado, sem gravar nada — mesmo espírito de
 *  `computeUserGamificationStats`, que default para `0` sem criar um `UserStreak`). */
export async function getOrCreateProfile(userId: string, now: Date): Promise<ProfileEntity> {
  const repos = getRepositories();
  const existing = await repos.profiles.findByUserId(userId);
  if (existing) {
    return existing;
  }
  return repos.profiles.create({ userId, now });
}

/** Resolve o "concurso principal" (`Profile.targetContestId`) para nome/id de exibição — via
 *  `CourseRepository.listByContestId` (não existe `ContestRepository` dedicado ainda; pendência
 *  registrada no relatório da fase). `null` quando não escolhido ou quando nenhum curso do
 *  catálogo pertence a esse concurso. */
export async function resolveMainContest(contestId: string | null): Promise<ProfileContestSummaryDTO | null> {
  if (!contestId) {
    return null;
  }
  const repos = getRepositories();
  const [course] = await repos.courses.listByContestId(contestId);
  if (!course) {
    return null;
  }
  return { contestId: course.contestId, contestName: course.contestName };
}

/** "Concursos de interesse" — DERIVADO das matrículas reais do usuário (`EnrollmentRepository`
 *  + `CourseRepository`), nunca um campo próprio persistido (evita duplicar estado que já
 *  existe em `Enrollment`). Distintos por `contestId`, na ordem da primeira matrícula. */
export async function resolveInterestedContests(userId: string): Promise<ProfileContestSummaryDTO[]> {
  const repos = getRepositories();
  const enrollments = await repos.enrollments.listByUserId(userId);
  const byContestId = new Map<string, ProfileContestSummaryDTO>();

  for (const enrollment of enrollments) {
    const course = await repos.courses.findById(enrollment.courseId);
    if (course && !byContestId.has(course.contestId)) {
      byContestId.set(course.contestId, { contestId: course.contestId, contestName: course.contestName });
    }
  }

  return [...byContestId.values()];
}

/** "Data da prova" — DERIVADA do plano de estudos ATIVO (`StudyPlan.endDate`, já renomeado
 *  `examDate` em `StudyPlanDTO`), nunca um campo próprio em `Profile`. Lida diretamente do
 *  repositório (não via `getPlan`, que é `assertOwnership`-gated e rejeitaria ao resolver o
 *  perfil PÚBLICO de outro usuário) — mesmo padrão de leitura direta de `ranking/metrics.ts`. */
export async function resolveExamDate(userId: string): Promise<string | null> {
  const repos = getRepositories();
  const plan = await repos.studyPlans.findActiveByUserId(userId);
  return plan?.endDate ?? null;
}

/** Agregados COMPLETOS (sem máscara) — quem chama (`./read.ts`) aplica a privacidade por cima
 *  quando o alvo não é o próprio usuário autenticado. */
export async function buildAggregates(userId: string): Promise<ProfileAggregatesDTO> {
  const [gamification, stats, rankingPosition, averageScore] = await Promise.all([
    computeUserGamificationView(userId),
    computeUserGamificationStats(userId),
    getUserRankingPosition(userId),
    computeAverageMockExamScorePercent(userId),
  ]);

  const unlocked = gamification.achievements.filter(
    (achievement) => achievement.unlocked && achievement.unlockedAt !== null,
  );
  const recentAchievements = [...unlocked]
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))
    .slice(0, 5)
    .map((achievement) => ({
      key: achievement.key,
      name: achievement.name,
      icon: achievement.icon,
      unlockedAt: achievement.unlockedAt as string,
    }));

  return {
    level: { index: gamification.level.level.index, name: gamification.level.level.name },
    points: gamification.points,
    xp: gamification.xp,
    rankingPosition: rankingPosition?.position ?? null,
    rankingTotalParticipants: rankingPosition?.totalParticipants ?? null,
    studyHours: Math.round(stats.studyHours * 100) / 100,
    lessonsCompleted: stats.lessonsCompleted,
    mockExamsCompleted: stats.mockExamsCompleted,
    averageMockExamScorePercent: averageScore,
    streakDays: stats.streakDays,
    achievementsUnlockedCount: unlocked.length,
    achievementsTotalCount: gamification.achievements.length,
    recentAchievements,
  };
}

/** Aplica a máscara de privacidade sobre agregados já computados, de acordo com as flags do
 *  `Profile` do ALVO (nunca as do visitante) — usado só quando `!isOwnProfile`. */
export function maskAggregatesForVisitor(full: ProfileAggregatesDTO, profile: ProfileEntity): ProfileAggregatesDTO {
  return {
    ...full,
    rankingPosition: profile.showInRanking ? full.rankingPosition : null,
    rankingTotalParticipants: profile.showInRanking ? full.rankingTotalParticipants : null,
    studyHours: profile.showStudyHours ? full.studyHours : null,
    lessonsCompleted: profile.showStudyHours ? full.lessonsCompleted : null,
    mockExamsCompleted: profile.showStudyHours ? full.mockExamsCompleted : null,
    // `streakDays` é métrica de esforço como as horas — segue a MESMA flag (achado B2).
    streakDays: profile.showStudyHours ? full.streakDays : null,
    averageMockExamScorePercent: profile.showPerformance ? full.averageMockExamScorePercent : null,
  };
}
