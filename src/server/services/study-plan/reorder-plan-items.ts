import type { ReorderPlanItemsInput, StudyPlanItemDTO } from "@/contracts/study-plan";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { NotFoundError, ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toStudyPlanItemDTOs } from "./mappers";

/**
 * Persiste a nova ordem dos itens do plano (drag-and-drop) — `input.itemIds` é sempre a lista
 * COMPLETA de itens do plano, na ordem final desejada (nunca incremental).
 *
 * Anti-IDOR (ADR-0006): valida que `planId` pertence ao usuário autenticado E que o CONJUNTO
 * de `itemIds` recebido é EXATAMENTE igual ao conjunto de itens que já pertencem a esse plano
 * (nem a mais, nem a menos) — impede tanto referenciar um item de outro plano quanto reordenar
 * um subconjunto ambíguo (itens omitidos ficariam com posição indefinida). IDEMPOTENTE: chamar
 * de novo com a mesma ordem final não altera nada além de nenhum `updatedAt`
 * (`MockStudyPlanItemRepository.reorder`).
 */
export async function reorderPlanItems(
  userId: string,
  input: ReorderPlanItemsInput,
  now: Date = new Date(),
): Promise<StudyPlanItemDTO[]> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const plan = await repos.studyPlans.findById(input.planId);
  if (!plan || plan.userId !== userId) {
    throw new NotFoundError("Plano não encontrado.");
  }

  const currentItems = await repos.studyPlanItems.listByPlanId(plan.id);
  const currentIds = new Set(currentItems.map((item) => item.id));
  const requestedIds = new Set(input.itemIds);

  // Duplicata na lista (`[A,A,B]`) produziria uma ordem ambígua e mascararia um item omitido:
  // `requestedIds` teria tamanho menor que `input.itemIds`. Barrado no contrato Zod
  // (`reorderPlanItemsInputSchema`); reforçado aqui pois o serviço pode ser chamado direto
  // (ex.: testes) sem passar pelo schema — defesa em profundidade.
  if (requestedIds.size !== input.itemIds.length) {
    throw new ValidationError("A lista de itens não pode conter itens repetidos.", {
      itemIds: ["Há itens repetidos na ordenação."],
    });
  }

  const sameSize = currentIds.size === requestedIds.size;
  const sameMembers = sameSize && [...currentIds].every((id) => requestedIds.has(id));
  if (!sameMembers) {
    throw new ValidationError("A lista de itens não corresponde aos itens atuais do plano.", {
      itemIds: ["Informe exatamente os itens já existentes no plano, sem adicionar nem remover."],
    });
  }

  const reordered = await repos.studyPlanItems.reorder(plan.id, input.itemIds, now);

  auditLog({
    operation: "study-plan.reorder-items",
    userId,
    entity: "StudyPlan",
    entityId: plan.id,
    result: "success",
    correlationId: plan.id,
    metadata: { itemCount: reordered.length },
  });

  return toStudyPlanItemDTOs(reordered);
}
