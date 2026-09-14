import { inRepositoryTransaction } from "@/server/repositories/transaction";
import { STUDY_PLAN } from "@/config/business";
import type { BrainstormCardDTO } from "@/contracts/brainstorm";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import { toIsoDateUTC } from "@/server/services/study-plan";
import { toBrainstormCardDTO } from "./mappers";
import { loadOwnedCard } from "./shared";

/**
 * Converte um cartão em um item REAL do plano de estudos (reaproveita os repositórios de Plano
 * de Estudos da Fase 11 — `repos.studyPlans`/`repos.studyPlanItems`, sem TODO: a conversão
 * funciona de ponta a ponta). Cria o plano ativo do aluno se ele ainda não tiver um (título
 * default, sem data de prova definida — o aluno ajusta depois pela tela de plano). O item
 * entra como `kind: "CUSTOM"`, ao final da lista atual, sem `targetDate` (o aluno organiza a
 * data depois). Marca o cartão como `CONVERTED`. IDEMPOTENTE: se o cartão já tem
 * `convertedStudyPlanItemId`, devolve o estado atual sem criar um 2º item.
 *
 * Autorização (ADR-0006): `requireUser` + `assertOwnership` + `loadOwnedCard` (anti-IDOR).
 */
async function convertToStudyTaskInTransaction(
  userId: string,
  cardId: string,
  now: Date = new Date(),
): Promise<BrainstormCardDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const { column, card } = await loadOwnedCard(userId, cardId);

  if (card.convertedStudyPlanItemId) {
    return toBrainstormCardDTO(card, column.name); // já convertido — idempotente.
  }

  const repos = getRepositories();
  const plan =
    (await repos.studyPlans.findActiveByUserId(userId)) ??
    (await repos.studyPlans.create({
      userId,
      title: STUDY_PLAN.defaultPlanTitle,
      startDate: toIsoDateUTC(now),
      endDate: null,
      now,
    }));

  const existingItems = await repos.studyPlanItems.listByPlanId(plan.id);
  const [createdItem] = await repos.studyPlanItems.createMany([
    {
      studyPlanId: plan.id,
      kind: "CUSTOM",
      subjectId: card.subjectId,
      topicId: card.topicId,
      lessonId: null,
      title: card.title,
      targetDate: null,
      estimatedMinutes: null,
      order: existingItems.length,
      now,
    },
  ]);
  /* c8 ignore next 3 -- createMany([um item]) sempre devolve exatamente um item; defensivo. */
  if (!createdItem) {
    throw new Error("[brainstorm] Falha ao criar item de plano de estudos a partir do cartão.");
  }

  const updated = await repos.brainstormCards.update({
    id: card.id,
    status: "CONVERTED",
    convertedStudyPlanItemId: createdItem.id,
    now,
  });

  await auditLog({
    operation: "brainstorm.convert-to-study-task",
    userId,
    entity: "BrainstormCard",
    entityId: card.id,
    result: "success",
    correlationId: card.id,
    metadata: { studyPlanId: plan.id, studyPlanItemId: createdItem.id },
  });

  return toBrainstormCardDTO(updated, column.name);
}

export async function convertToStudyTask(...args: Parameters<typeof convertToStudyTaskInTransaction>): ReturnType<typeof convertToStudyTaskInTransaction> {
  return inRepositoryTransaction(() => convertToStudyTaskInTransaction(...args));
}
