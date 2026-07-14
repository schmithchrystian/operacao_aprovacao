import type { CreateDeckInput, DeckDTO } from "@/contracts/flashcards";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toDeckDTO } from "./mappers";

/**
 * Cria um baralho PESSOAL (`kind: "PERSONAL"`) para o aluno autenticado. Baralhos de matéria são
 * conteúdo do sistema (fora do escopo desta action); os de "criados do caderno de
 * erros"/"criados de anotações" são auto-provisionados por `createFromErrors`/`createFromNotes`
 * (`./shared.ts#getOrCreatePersonalDeck`), nunca por esta função.
 *
 * Autorização (ADR-0006): `requireUser` + `assertOwnership`.
 */
export async function createDeck(userId: string, input: CreateDeckInput, now: Date = new Date()): Promise<DeckDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  if (input.subjectId) {
    const subject = await repos.subjects.findById(input.subjectId);
    if (!subject) {
      throw new ValidationError("Matéria inválida.", { subjectId: ["Matéria não encontrada."] });
    }
  }

  const deck = await repos.flashcardDecks.create({
    userId,
    subjectId: input.subjectId ?? null,
    title: input.title,
    isPublic: false,
    kind: "PERSONAL",
    now,
  });

  auditLog({
    operation: "flashcards.create-deck",
    userId,
    entity: "FlashcardDeck",
    entityId: deck.id,
    result: "success",
    correlationId: deck.id,
  });

  return toDeckDTO(deck, 0, 0);
}
