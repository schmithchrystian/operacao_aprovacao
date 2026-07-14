import { STUDY_PLAN } from "@/config/business";
import type { GeneratePlanInput, StudyPlanDTO } from "@/contracts/study-plan";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { NotFoundError, ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import type { StudyPlanItemKind } from "@/server/repositories/contracts/study-plan-item-repository";
import { toIsoDateUTC } from "./date-utils";
import { getPlan } from "./get-plan";
import { generateStudyPlanItems, type PlanGeneratorItem } from "./plan-generator";

/**
 * "Plano de estudos" — gera (ou REGENERA) o plano ATIVO do aluno autenticado a partir de:
 * data da prova, dias/horas disponíveis e peso das matérias (CLAUDE.md — Fase 11). Nunca cria
 * um segundo plano concorrente: se já existe um plano `ACTIVE`, seus metadados são atualizados
 * e TODOS os itens são substituídos pelo novo conjunto gerado (evita acumular itens obsoletos
 * a cada nova chamada). Autorização (ADR-0006): `requireUser` + `assertOwnership`.
 *
 * `now` é sempre injetado (default `new Date()`, avaliado uma única vez na entrada da função —
 * mesma convenção de `checkHeartbeatRateLimit`) e usado para TODOS os timestamps desta chamada
 * (criação/atualização do plano, criação dos itens, cálculo de progresso no retorno).
 */
export async function generatePlan(
  userId: string,
  input: GeneratePlanInput,
  now: Date = new Date(),
): Promise<StudyPlanDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();

  // Valida que toda matéria informada existe de verdade — nunca grava um item de plano
  // "órfão" a partir de um `subjectId` fabricado pelo cliente.
  const subjectsWithNames = await Promise.all(
    input.subjectWeights.map(async (entry) => {
      const subject = await repos.subjects.findById(entry.subjectId);
      if (!subject) {
        throw new ValidationError("Matéria inválida.", {
          subjectWeights: [`Matéria não encontrada: ${entry.subjectId}`],
        });
      }
      return { subjectId: entry.subjectId, weight: entry.weight, name: subject.name };
    }),
  );
  const subjectNameById = new Map(subjectsWithNames.map((entry) => [entry.subjectId, entry.name]));

  const startDate = input.startDate ? toIsoDateUTC(input.startDate) : toIsoDateUTC(now);
  const examDate = toIsoDateUTC(input.examDate);

  const generatorItems = generateStudyPlanItems({
    startDate,
    examDate,
    daysPerWeek: input.daysPerWeek,
    hoursPerDay: input.hoursPerDay,
    subjects: subjectsWithNames.map(({ subjectId, weight }) => ({ subjectId, weight })),
    includeReviews: input.includeReviews,
    includeMockExams: input.includeMockExams,
  });

  if (generatorItems.length === 0) {
    throw new ValidationError("Não foi possível gerar itens para o período informado.", {
      examDate: ["Verifique a data da prova e a data de início."],
    });
  }

  const existingPlan = await repos.studyPlans.findActiveByUserId(userId);
  const title = input.title ?? STUDY_PLAN.defaultPlanTitle;

  const plan = existingPlan
    ? await repos.studyPlans.update({ id: existingPlan.id, title, startDate, endDate: examDate, now })
    : await repos.studyPlans.create({ userId, title, startDate, endDate: examDate, now });

  // Regenerar SUBSTITUI o conteúdo do plano ativo em vez de acumular.
  await repos.studyPlanItems.deleteByPlanId(plan.id);

  await repos.studyPlanItems.createMany(
    generatorItems.map((item) => ({
      studyPlanId: plan.id,
      kind: item.kind as StudyPlanItemKind,
      subjectId: item.subjectId,
      topicId: null,
      lessonId: null,
      title: titleForGeneratedItem(item, subjectNameById),
      targetDate: item.date,
      estimatedMinutes: item.estimatedMinutes,
      order: item.order,
      now,
    })),
  );

  auditLog({
    operation: "study-plan.generate",
    userId,
    entity: "StudyPlan",
    entityId: plan.id,
    result: "success",
    correlationId: plan.id,
    metadata: {
      itemCount: generatorItems.length,
      daysPerWeek: input.daysPerWeek,
      hoursPerDay: input.hoursPerDay,
      includeReviews: input.includeReviews,
      includeMockExams: input.includeMockExams,
    },
  });

  const rebuilt = await getPlan(userId, now);
  if (!rebuilt) {
    // Não deveria ocorrer — o plano acabou de ser criado/atualizado acima.
    throw new NotFoundError("Plano não encontrado após a geração.");
  }
  return rebuilt;
}

function titleForGeneratedItem(item: PlanGeneratorItem, subjectNameById: ReadonlyMap<string, string>): string {
  const subjectName = item.subjectId ? (subjectNameById.get(item.subjectId) ?? item.subjectId) : null;
  switch (item.kind) {
    case "STUDY":
      return `Estudar — ${subjectName}`;
    case "REVIEW":
      return `Revisão — ${subjectName}`;
    case "MOCK_EXAM":
      return "Simulado semanal";
    default:
      return "Item de plano de estudos";
  }
}
