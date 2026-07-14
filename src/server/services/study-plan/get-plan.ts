import type { StudyPlanDTO } from "@/contracts/study-plan";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import {
  buildDayGroups,
  buildMonthlyCalendar,
  buildWeeklyCalendar,
  computeProgress,
  computeSubjectWeights,
  toStudyPlanItemDTOs,
} from "./mappers";

/**
 * Lê o plano de estudos ATIVO do usuário autenticado — `null` quando ele ainda não gerou
 * nenhum plano (estado legítimo, não um erro — mesmo padrão de `getResumePoint`,
 * `@/server/services/courses/resume-point`). Autorização (ADR-0006): `requireUser` +
 * `assertOwnership`.
 */
export async function getPlan(userId: string, now: Date = new Date()): Promise<StudyPlanDTO | null> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const plan = await repos.studyPlans.findActiveByUserId(userId);
  if (!plan) {
    return null;
  }

  const itemEntities = await repos.studyPlanItems.listByPlanId(plan.id);
  const items = await toStudyPlanItemDTOs(itemEntities);
  const days = buildDayGroups(items);
  const subjectWeights = await computeSubjectWeights(items);

  return {
    id: plan.id,
    title: plan.title,
    status: plan.status,
    startDate: plan.startDate,
    examDate: plan.endDate,
    subjectWeights,
    items,
    weeklyCalendar: buildWeeklyCalendar(days),
    monthlyCalendar: buildMonthlyCalendar(days),
    progress: computeProgress(items, plan.endDate, now.toISOString()),
  };
}
