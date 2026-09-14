import { env } from "@/config/env";
import { inRepositoryTransaction } from "@/server/repositories/transaction";
import type { FlashcardDTO } from "@/contracts/flashcards";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import { listFlashcardDraftsByUserId } from "@/server/services/brainstorm";
import { toFlashcardDTOs } from "./mappers";
import { getOrCreatePersonalDeck, noteSourceTag } from "./shared";

const NOTES_DECK_TITLE = "Criados de anotações";
const EMPTY_ANSWER_FALLBACK = "Sem resposta anotada — complementar ao revisar.";

/**
 * Cria flashcards a partir dos rascunhos gerados pelo brainstorm (Fase 13,
 * `@/server/services/brainstorm/flashcard-draft-store.ts` — `convertToFlashcard` grava um
 * rascunho com pergunta = título do cartão, resposta = conteúdo do cartão): cada rascunho vira
 * um cartão no baralho pessoal "Criados de anotações" (auto-provisionado, get-or-create, ver
 * `./shared.ts#getOrCreatePersonalDeck`). Sem matéria/assunto (o rascunho não carrega essa
 * informação) — `subjectId`/`topicId` sempre `null` nos cartões criados aqui.
 *
 * IDEMPOTENTE: cada rascunho só vira UM cartão, mesmo chamando esta função várias vezes — a
 * marcação reservada `src:note:<draftId>` (`./shared.ts#noteSourceTag`) no cartão já criado é o
 * que permite detectar "este rascunho já foi importado" sem exigir uma coluna nova no schema
 * (mesma técnica de `createFromErrors`, ver `docs/FLASHCARDS.md`). Retorna o estado ATUAL
 * completo do baralho (cartões antigos + novos), não só os recém-criados.
 *
 * Autorização (ADR-0006): `requireUser` + `assertOwnership`.
 */
async function createFromNotesInTransaction(userId: string, now: Date = new Date()): Promise<FlashcardDTO[]> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const drafts = env.DATA_SOURCE === "prisma"
    ? await (await import("@/server/repositories/prisma/note-source-repository")).listNoteSources(userId)
    : listFlashcardDraftsByUserId(userId);

  const deck = await getOrCreatePersonalDeck(userId, "NOTES", NOTES_DECK_TITLE, now);
  const existingCards = await repos.flashcards.listByDeckId(deck.id);
  const alreadyImported = new Set(
    existingCards.flatMap((card) => card.tags.filter((tag) => tag.startsWith("src:note:"))),
  );

  for (const draft of drafts) {
    const tag = noteSourceTag(draft.id);
    if (alreadyImported.has(tag)) continue; // já importado — nunca duplica (idempotente).

    await repos.flashcards.create({
      deckId: deck.id,
      subjectId: null,
      topicId: null,
      question: draft.question,
      answer: draft.answer.trim().length > 0 ? draft.answer : EMPTY_ANSWER_FALLBACK,
      difficulty: "MEDIUM",
      tags: [tag],
      now,
    });
  }

  await auditLog({
    operation: "flashcards.create-from-notes",
    userId,
    entity: "FlashcardDeck",
    entityId: deck.id,
    result: "success",
    correlationId: deck.id,
    metadata: { draftCount: drafts.length },
  });

  const finalCards = await repos.flashcards.listByDeckId(deck.id);
  return toFlashcardDTOs(finalCards, userId, now);
}

export async function createFromNotes(...args: Parameters<typeof createFromNotesInTransaction>): ReturnType<typeof createFromNotesInTransaction> {
  return inRepositoryTransaction(() => createFromNotesInTransaction(...args));
}
