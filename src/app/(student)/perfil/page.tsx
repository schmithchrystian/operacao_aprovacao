import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import type { ContestOption } from "@/components/profile/edit-profile-dialog";
import type { ProfileXpProgress } from "@/components/profile/profile-header";
import { ProfileWorkspace } from "@/components/profile/profile-workspace";
import { isOwnProfileComplete } from "@/components/profile/types";
import { diffCalendarDaysUtc } from "@/lib/utils";
import { listCoursesAction } from "@/server/actions/courses";
import { getUserGamificationAction } from "@/server/actions/gamification";
import { getOwnProfileAction } from "@/server/actions/profile";

export const metadata: Metadata = { title: "Perfil" };

const BREADCRUMBS = [{ label: "Início", href: "/dashboard" }, { label: "Perfil" }];

/**
 * "Meu perfil" (Fase 16 — UI do agente `frontend`). Server Component: busca o perfil completo do
 * aluno autenticado (`getOwnProfileAction`) e delega a renderização/estado para
 * `ProfileWorkspace` (Client), que possui o estado após edições (mesmo padrão de
 * `StudyPlanWorkspace`/`FlashcardsWorkspace`).
 *
 * Duas buscas adicionais são só "nice to have" (nunca fatais — cada uma degrada graciosamente,
 * mesmo padrão de `subjectsResult.ok ? subjectsResult.data : []` em `/plano-de-estudos`):
 * - `getUserGamificationAction`: dá o XP mínimo do nível atual/próximo (`ComputedLevel`,
 *   `@/server/services/gamification/levels.ts`) para a barra de progresso do cabeçalho —
 *   `ProfileAggregatesDTO` não expõe esses limiares (só o nível já resolvido), e inventá-los no
 *   frontend duplicaria a régua de níveis do agente `gamification`. Falhar aqui não impede a
 *   página: o cabeçalho simplesmente não mostra a barra de "próximo nível".
 * - `listCoursesAction`: só para popular o `<select>` de "concurso principal" do formulário de
 *   edição (deduplicado por `contestId`) — falhar aqui não impede editar os outros campos.
 *
 * Falha em `getOwnProfileAction` (ou um DTO de "meu perfil" incompleto — nunca deveria acontecer)
 * É um erro real, vira `ErrorState`.
 */
export default async function PerfilPage() {
  const [profileResult, gamificationResult, coursesResult] = await Promise.all([
    getOwnProfileAction(),
    getUserGamificationAction(),
    listCoursesAction(),
  ]);

  if (!profileResult.ok) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={BREADCRUMBS} />
        <ErrorState title="Não foi possível carregar seu perfil" description={profileResult.error.message} />
      </div>
    );
  }

  const profile = profileResult.data;
  if (!isOwnProfileComplete(profile)) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={BREADCRUMBS} />
        <ErrorState
          title="Não foi possível carregar seu perfil"
          description="Os dados do perfil vieram incompletos. Tente novamente em instantes."
        />
      </div>
    );
  }

  const xpProgress: ProfileXpProgress | null = gamificationResult.ok
    ? {
        levelIndex: gamificationResult.data.level.level.index,
        levelName: gamificationResult.data.level.level.name,
        xp: gamificationResult.data.xp,
        progressPercent: gamificationResult.data.level.progressPercent,
        xpToNextLevel: gamificationResult.data.level.xpToNextLevel,
      }
    : null;

  const daysUntilExam = profile.examDate ? diffCalendarDaysUtc(profile.examDate, new Date()) : null;

  const courses = coursesResult.ok ? coursesResult.data : [];
  const contestOptionsById = new Map<string, ContestOption>();
  for (const course of courses) {
    if (!contestOptionsById.has(course.contestId)) {
      contestOptionsById.set(course.contestId, { value: course.contestId, label: course.contestName });
    }
  }
  // Garante que o concurso principal ATUAL sempre apareça como opção, mesmo que
  // `listCoursesAction` tenha falhado ou não traga mais esse concurso no catálogo — perder a
  // opção selecionada faria o `<select>` "esquecer" silenciosamente o valor salvo.
  if (profile.mainContest && !contestOptionsById.has(profile.mainContest.contestId)) {
    contestOptionsById.set(profile.mainContest.contestId, {
      value: profile.mainContest.contestId,
      label: profile.mainContest.contestName,
    });
  }
  const contestOptions = [...contestOptionsById.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={BREADCRUMBS} />
      <ProfileWorkspace
        initialProfile={profile}
        xpProgress={xpProgress}
        daysUntilExam={daysUntilExam}
        contestOptions={contestOptions}
      />
    </div>
  );
}
