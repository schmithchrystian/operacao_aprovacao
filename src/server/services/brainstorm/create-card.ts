import type { BrainstormCardDTO, CreateCardInput } from "@/contracts/brainstorm";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toBrainstormCardDTO } from "./mappers";
import { loadOwnedColumn } from "./shared";

/**
 * Cria um cartão numa coluna do quadro do usuário autenticado — sempre ao final da coluna
 * (`order` = quantidade atual de cartões). Autorização (ADR-0006): `requireUser` +
 * `assertOwnership` + `loadOwnedColumn` (anti-IDOR — coluna de outro usuário sempre 404).
 *
 * Valida que `subjectId`/`topicId` (quando informados) existem de verdade e que o assunto
 * pertence à matéria informada — nunca grava um cartão "órfão" a partir de ids fabricados pelo
 * cliente (mesmo padrão de `generatePlan`, `@/server/services/study-plan/generate-plan.ts`).
 */
export async function createCard(
  userId: string,
  input: CreateCardInput,
  now: Date = new Date(),
): Promise<BrainstormCardDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const { column } = await loadOwnedColumn(userId, input.columnId);
  const repos = getRepositories();

  if (input.subjectId) {
    const subject = await repos.subjects.findById(input.subjectId);
    if (!subject) {
      throw new ValidationError("Matéria inválida.", { subjectId: ["Matéria não encontrada."] });
    }
  }
  if (input.topicId) {
    const topic = await repos.topics.findById(input.topicId);
    if (!topic) {
      throw new ValidationError("Assunto inválido.", { topicId: ["Assunto não encontrado."] });
    }
    if (input.subjectId && topic.subjectId !== input.subjectId) {
      throw new ValidationError("Assunto não pertence à matéria informada.", {
        topicId: ["Assunto de outra matéria."],
      });
    }
  }

  const existingCards = await repos.brainstormCards.listByColumnIds([column.id]);

  const card = await repos.brainstormCards.create({
    columnId: column.id,
    type: input.type,
    title: input.title,
    content: input.content ?? null,
    tags: input.tags,
    subjectId: input.subjectId ?? null,
    topicId: input.topicId ?? null,
    priority: input.priority,
    order: existingCards.length,
    now,
  });

  auditLog({
    operation: "brainstorm.create-card",
    userId,
    entity: "BrainstormCard",
    entityId: card.id,
    result: "success",
    correlationId: card.id,
    metadata: { columnId: column.id, type: card.type },
  });

  return toBrainstormCardDTO(card, column.name);
}
