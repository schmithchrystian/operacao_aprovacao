import type { BrainstormCardDTO, UpdateCardInput } from "@/contracts/brainstorm";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toBrainstormCardDTO } from "./mappers";
import { loadOwnedCard } from "./shared";

/**
 * Atualiza o conteúdo de um cartão (título/conteúdo/tags/tipo/matéria/assunto/prioridade) — não
 * move o cartão de coluna nem altera `status`/conversão (isso é `moveCard`/`markResolved`/
 * `convertToFlashcard`/`convertToStudyTask`). Autorização (ADR-0006): `requireUser` +
 * `assertOwnership` + `loadOwnedCard` (anti-IDOR).
 */
export async function updateCard(
  userId: string,
  input: UpdateCardInput,
  now: Date = new Date(),
): Promise<BrainstormCardDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const { column, card } = await loadOwnedCard(userId, input.cardId);
  const repos = getRepositories();

  const effectiveSubjectId = input.subjectId === undefined ? card.subjectId : input.subjectId;

  if (input.subjectId !== undefined && input.subjectId !== null) {
    const subject = await repos.subjects.findById(input.subjectId);
    if (!subject) {
      throw new ValidationError("Matéria inválida.", { subjectId: ["Matéria não encontrada."] });
    }
  }
  if (input.topicId !== undefined && input.topicId !== null) {
    const topic = await repos.topics.findById(input.topicId);
    if (!topic) {
      throw new ValidationError("Assunto inválido.", { topicId: ["Assunto não encontrado."] });
    }
    if (effectiveSubjectId && topic.subjectId !== effectiveSubjectId) {
      throw new ValidationError("Assunto não pertence à matéria informada.", {
        topicId: ["Assunto de outra matéria."],
      });
    }
  }

  const updated = await repos.brainstormCards.update({
    id: card.id,
    type: input.type,
    title: input.title,
    content: input.content,
    tags: input.tags,
    subjectId: input.subjectId,
    topicId: input.topicId,
    priority: input.priority,
    now,
  });

  await auditLog({
    operation: "brainstorm.update-card",
    userId,
    entity: "BrainstormCard",
    entityId: updated.id,
    result: "success",
    correlationId: updated.id,
  });

  return toBrainstormCardDTO(updated, column.name);
}
