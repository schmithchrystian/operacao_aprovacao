import type { StudyPlanDayDTO, StudyPlanItemDTO } from "@/contracts/study-plan";

/**
 * Calcula a lista COMPLETA de ids do plano (`reorderPlanItemsInputSchema.itemIds`) resultante de
 * mover um item DENTRO de um dia — `reorderPlanItemsAction` sempre exige o conjunto inteiro do
 * plano, nunca um subconjunto (ver `@/server/services/study-plan/reorder-plan-items.ts`), porque
 * `order` é uma sequência ÚNICA/global do plano inteiro (não por dia) — `StudyPlanDayDTO.items`
 * já é só um recorte, na mesma ordem relativa, desse array global (`buildDayGroups` no backend).
 *
 * Função pura: preserva a posição relativa de todo item que NÃO pertence a este dia, e só
 * reordena os ids do dia entre si nas mesmas posições ("slots") que eles já ocupavam na
 * sequência global — exatamente o suficiente para "arrastar para reordenar dentro do dia" sem
 * afetar a posição de itens de outros dias.
 */
export function reorderDayItems(
  allItems: readonly StudyPlanItemDTO[],
  day: StudyPlanDayDTO,
  fromIndex: number,
  toIndex: number,
): string[] {
  const currentIds = allItems.map((item) => item.id);

  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= day.items.length ||
    toIndex >= day.items.length
  ) {
    return currentIds;
  }

  const dayIds = day.items.map((item) => item.id);
  const reorderedDayIds = [...dayIds];
  const [movedId] = reorderedDayIds.splice(fromIndex, 1);
  if (movedId === undefined) {
    return currentIds;
  }
  reorderedDayIds.splice(toIndex, 0, movedId);

  const daySet = new Set(dayIds);
  let cursor = 0;

  return allItems.map((item) => {
    if (!daySet.has(item.id)) {
      return item.id;
    }
    const nextId = reorderedDayIds[cursor];
    cursor += 1;
    return nextId ?? item.id;
  });
}
