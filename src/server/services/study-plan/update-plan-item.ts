import type { StudyPlanItemDTO, UpdatePlanItemInput } from "@/contracts/study-plan";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toStudyPlanItemDTO } from "./mappers";

/**
 * Atualiza um item do plano de estudos (status/data alvo/minutos estimados/título) — usado
 * pelas telas de acompanhamento e por arrastar um item para outro dia (`targetDate`); reordenar
 * DENTRO do mesmo dia é `reorderPlanItems`.
 *
 * Autorização (ADR-0006): `requireUser` + `assertOwnership` do usuário. Anti-IDOR: valida que
 * `itemId` pertence de fato a `planId` E que `planId` pertence ao usuário autenticado — em
 * caso de divergência, trata como 404 (`NotFoundError`), não 403, para não confirmar a
 * existência de um plano/item de outro usuário (mesmo padrão de anti-IDOR de path já usado em
 * `services/study-tracking/lesson-view.ts#getLessonView`).
 */
export async function updatePlanItem(
  userId: string,
  input: UpdatePlanItemInput,
  now: Date = new Date(),
): Promise<StudyPlanItemDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const plan = await repos.studyPlans.findById(input.planId);
  if (!plan || plan.userId !== userId) {
    throw new NotFoundError("Plano não encontrado.");
  }

  const item = await repos.studyPlanItems.findById(input.itemId);
  if (!item || item.studyPlanId !== plan.id) {
    throw new NotFoundError("Item de plano não encontrado.");
  }

  const updated = await repos.studyPlanItems.update({
    id: item.id,
    status: input.status,
    targetDate: input.targetDate,
    estimatedMinutes: input.estimatedMinutes,
    title: input.title,
    now,
  });

  auditLog({
    operation: "study-plan.update-item",
    userId,
    entity: "StudyPlanItem",
    entityId: updated.id,
    result: "success",
    correlationId: updated.id,
    metadata: { status: updated.status },
  });

  return toStudyPlanItemDTO(updated);
}
