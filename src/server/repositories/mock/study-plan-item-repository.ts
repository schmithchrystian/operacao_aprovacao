import { mockStudyPlanItems } from "@/mocks";
import type {
  StudyPlanItemCreateInput,
  StudyPlanItemEntity,
  StudyPlanItemRepository,
  StudyPlanItemUpdateInput,
} from "../contracts/study-plan-item-repository";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/study-plan.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo. */
const store = mockStore<StudyPlanItemEntity[]>("study-plan-item", () => [...mockStudyPlanItems]);
const sequence = mockStore<{ value: number }>("study-plan-item:sequence", () => ({ value: store.length }));

export class MockStudyPlanItemRepository implements StudyPlanItemRepository {
  async findById(id: string): Promise<StudyPlanItemEntity | null> {
    return store.find((item) => item.id === id) ?? null;
  }

  async listByPlanId(planId: string): Promise<StudyPlanItemEntity[]> {
    return store.filter((item) => item.studyPlanId === planId).sort((a, b) => a.order - b.order);
  }

  async createMany(inputs: StudyPlanItemCreateInput[]): Promise<StudyPlanItemEntity[]> {
    const created = inputs.map((input): StudyPlanItemEntity => {
      sequence.value += 1;
      const nowIso = input.now.toISOString();
      return {
        id: `study-plan-item-mock-${sequence.value}`,
        studyPlanId: input.studyPlanId,
        kind: input.kind,
        subjectId: input.subjectId,
        topicId: input.topicId,
        lessonId: input.lessonId,
        title: input.title,
        targetDate: input.targetDate,
        estimatedMinutes: input.estimatedMinutes,
        order: input.order,
        status: "PENDING",
        completedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });
    store.push(...created);
    return created;
  }

  async update(input: StudyPlanItemUpdateInput): Promise<StudyPlanItemEntity> {
    const index = store.findIndex((item) => item.id === input.id);
    if (index < 0) {
      throw new Error(`[mocks/study-plan-item] Item não encontrado: ${input.id}`);
    }
    const current = store[index]!;
    const nowIso = input.now.toISOString();
    const nextStatus = input.status ?? current.status;
    // Invariante mantida por esta função: `completedAt` só é não-nulo quando `status === "DONE"`
    // — reaproveita o valor já gravado se o item já estava DONE (idempotente), grava `now` na
    // transição PENDING/IN_PROGRESS/SKIPPED → DONE, e limpa ao sair de DONE para outro status.
    const completedAt = nextStatus === "DONE" ? (current.status === "DONE" ? current.completedAt : nowIso) : null;

    const updated: StudyPlanItemEntity = {
      ...current,
      status: nextStatus,
      targetDate: input.targetDate === undefined ? current.targetDate : input.targetDate,
      estimatedMinutes:
        input.estimatedMinutes === undefined ? current.estimatedMinutes : input.estimatedMinutes,
      title: input.title ?? current.title,
      completedAt,
      updatedAt: nowIso,
    };
    store[index] = updated;
    return updated;
  }

  async reorder(planId: string, orderedItemIds: string[], now: Date): Promise<StudyPlanItemEntity[]> {
    const nowIso = now.toISOString();
    const positionById = new Map(orderedItemIds.map((id, index) => [id, index]));
    // Identidade do array precisa ficar estável (`mockStore`, ver `./mock-store.ts`) — muta em
    // vez de reatribuir `store`.
    const reordered = store.map((item) => {
      if (item.studyPlanId !== planId) return item;
      const newOrder = positionById.get(item.id);
      // Item não incluído em `orderedItemIds` (não deveria ocorrer — o serviço valida o
      // conjunto completo antes de chamar `reorder`) ou já na posição correta: sem alteração.
      if (newOrder === undefined || newOrder === item.order) return item;
      return { ...item, order: newOrder, updatedAt: nowIso };
    });
    store.splice(0, store.length, ...reordered);
    return this.listByPlanId(planId);
  }

  async deleteByPlanId(planId: string): Promise<void> {
    const remaining = store.filter((item) => item.studyPlanId !== planId);
    store.splice(0, store.length, ...remaining);
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockStudyPlanItemStore(): void {
  store.splice(0, store.length, ...mockStudyPlanItems);
  sequence.value = store.length;
}
