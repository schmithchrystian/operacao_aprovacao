import type { CreateFlashcardInput, FlashcardDTO } from "@/contracts/flashcards";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toFlashcardDTO } from "./mappers";
import { loadOwnedDeck } from "./shared";

/**
 * Cria um cartão num baralho PRÓPRIO do aluno autenticado (nunca num baralho de matéria/sistema
 * — `loadOwnedDeck` rejeita com `NotFoundError` caso contrário, anti-IDOR). Valida que
 * `subjectId`/`topicId` (quando informados) existem de verdade e que o assunto pertence à
 * matéria informada — mesmo padrão de `@/server/services/brainstorm/create-card.ts`.
 *
 * Autorização (ADR-0006): `requireUser` + `assertOwnership` + `loadOwnedDeck`.
 */
export async function createCard(
  userId: string,
  input: CreateFlashcardInput,
  now: Date = new Date(),
): Promise<FlashcardDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const deck = await loadOwnedDeck(userId, input.deckId);
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

  const card = await repos.flashcards.create({
    deckId: deck.id,
    subjectId: input.subjectId ?? null,
    topicId: input.topicId ?? null,
    question: input.question,
    answer: input.answer,
    difficulty: input.difficulty,
    tags: input.tags,
    now,
  });

  auditLog({
    operation: "flashcards.create-card",
    userId,
    entity: "Flashcard",
    entityId: card.id,
    result: "success",
    correlationId: card.id,
    metadata: { deckId: deck.id },
  });

  return toFlashcardDTO(card, userId, now, deck);
}
