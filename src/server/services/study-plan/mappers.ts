import type {
  StudyPlanDayDTO,
  StudyPlanItemDTO,
  StudyPlanMonthDTO,
  StudyPlanProgressDTO,
  StudyPlanWeekDTO,
  SubjectWeightDTO,
} from "@/contracts/study-plan";
import { getRepositories } from "@/server/repositories";
import type { StudyPlanItemEntity } from "@/server/repositories/contracts/study-plan-item-repository";
import { diffDaysIso, monthKeyIso, toIsoDateUTC, weekStartIso } from "./date-utils";

/**
 * Mapeamento `StudyPlanItemEntity` (persistência) → `StudyPlanItemDTO` (contrato) — resolve os
 * nomes de matéria/assunto/aula (a entidade só guarda os ids, ADR-0003: DTO ≠ modelo persistido).
 */
export async function toStudyPlanItemDTO(item: StudyPlanItemEntity): Promise<StudyPlanItemDTO> {
  const repos = getRepositories();
  const [subject, topic, lesson] = await Promise.all([
    item.subjectId ? repos.subjects.findById(item.subjectId) : Promise.resolve(null),
    item.topicId ? repos.topics.findById(item.topicId) : Promise.resolve(null),
    item.lessonId ? repos.lessons.findById(item.lessonId) : Promise.resolve(null),
  ]);

  return {
    id: item.id,
    kind: item.kind,
    subjectId: item.subjectId,
    subjectName: subject?.name ?? null,
    topicId: item.topicId,
    topicName: topic?.name ?? null,
    lessonId: item.lessonId,
    lessonTitle: lesson?.title ?? null,
    title: item.title,
    targetDate: item.targetDate,
    estimatedMinutes: item.estimatedMinutes,
    order: item.order,
    status: item.status,
    completedAt: item.completedAt,
  };
}

export async function toStudyPlanItemDTOs(items: readonly StudyPlanItemEntity[]): Promise<StudyPlanItemDTO[]> {
  return Promise.all(items.map((item) => toStudyPlanItemDTO(item)));
}

/** Agrupa os itens (já em DTO) por `targetDate` — itens sem data não entram no calendário
 *  (não há "dia" para agrupá-los). */
export function buildDayGroups(items: readonly StudyPlanItemDTO[]): StudyPlanDayDTO[] {
  const byDate = new Map<string, StudyPlanItemDTO[]>();
  for (const item of items) {
    if (!item.targetDate) continue;
    const list = byDate.get(item.targetDate) ?? [];
    list.push(item);
    byDate.set(item.targetDate, list);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, dayItems]) => ({
      date,
      items: dayItems,
      totalMinutes: dayItems.reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0),
    }));
}

export function buildWeeklyCalendar(days: readonly StudyPlanDayDTO[]): StudyPlanWeekDTO[] {
  const byWeek = new Map<string, StudyPlanDayDTO[]>();
  for (const day of days) {
    const weekStart = weekStartIso(day.date);
    const list = byWeek.get(weekStart) ?? [];
    list.push(day);
    byWeek.set(weekStart, list);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([weekStart, weekDays]) => ({ weekStart, days: weekDays }));
}

export function buildMonthlyCalendar(days: readonly StudyPlanDayDTO[]): StudyPlanMonthDTO[] {
  const byMonth = new Map<string, StudyPlanDayDTO[]>();
  for (const day of days) {
    const month = monthKeyIso(day.date);
    const list = byMonth.get(month) ?? [];
    list.push(day);
    byMonth.set(month, list);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, monthDays]) => ({ month, days: monthDays }));
}

/**
 * Peso EFETIVO de cada matéria no plano atual (`SubjectWeightDTO` — ver o comentário do schema
 * em `@/contracts/study-plan`): soma de `estimatedMinutes` entre os itens `STUDY`/`REVIEW` de
 * cada matéria — proporcional ao peso de entrada usado na geração, mas não um eco literal dele
 * (o schema não guarda o peso de configuração original).
 */
export async function computeSubjectWeights(items: readonly StudyPlanItemDTO[]): Promise<SubjectWeightDTO[]> {
  const minutesBySubject = new Map<string, number>();
  for (const item of items) {
    if (!item.subjectId || (item.kind !== "STUDY" && item.kind !== "REVIEW")) continue;
    const current = minutesBySubject.get(item.subjectId) ?? 0;
    minutesBySubject.set(item.subjectId, current + (item.estimatedMinutes ?? 0));
  }

  const repos = getRepositories();
  const weights: SubjectWeightDTO[] = [];
  for (const [subjectId, minutes] of minutesBySubject) {
    const subject = await repos.subjects.findById(subjectId);
    if (!subject) continue;
    weights.push({ subjectId, subjectName: subject.name, weight: minutes });
  }

  return weights.sort((a, b) => b.weight - a.weight);
}

/** Estatísticas agregadas do plano — `nowIso` é sempre injetado (nunca `Date.now()` aqui). */
export function computeProgress(
  items: readonly StudyPlanItemDTO[],
  examDate: string | null,
  nowIso: string,
): StudyPlanProgressDTO {
  // `targetDate`/`examDate` são datas de calendário (meia-noite UTC); `nowIso` chega com hora.
  // Truncar "hoje" para a mesma escala antes de comparar evita que um item AGENDADO PARA HOJE
  // conte como atrasado (`generatePlan` usa `startDate = hoje`, então o plano recém-gerado teria
  // os itens do 1º dia marcados "atrasado") e evita o off-by-one de `daysUntilExam` conforme a
  // hora do dia.
  const todayIso = toIsoDateUTC(nowIso);
  const totalItems = items.length;
  const doneItems = items.filter((item) => item.status === "DONE").length;
  const overdueItems = items.filter(
    (item) =>
      item.targetDate !== null &&
      // Estritamente ANTES de hoje (dia anterior) — um item de hoje ainda não está atrasado.
      item.targetDate < todayIso &&
      (item.status === "PENDING" || item.status === "IN_PROGRESS"),
  ).length;
  const progressPercent = totalItems > 0 ? Math.round((doneItems / totalItems) * 10_000) / 100 : 0;
  const daysUntilExam = examDate ? diffDaysIso(todayIso, examDate) : null;

  return { totalItems, doneItems, progressPercent, overdueItems, daysUntilExam };
}
