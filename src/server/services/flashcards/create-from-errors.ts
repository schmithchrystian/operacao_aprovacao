import type { FlashcardDTO } from "@/contracts/flashcards";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import { toFlashcardDTOs } from "./mappers";
import { errorSourceTag, getOrCreatePersonalDeck } from "./shared";

const ERRORS_DECK_TITLE = "Criados do caderno de erros";

/**
 * Cria flashcards a partir do caderno de erros de simulados (Fase 10 — `simulations`,
 * `QuestionAttempt.isCorrect === false`): uma questão já errada pelo menos uma vez vira um
 * cartão de revisão (pergunta = enunciado, resposta = alternativa correta + explicação), no
 * baralho pessoal "Criados do caderno de erros" (auto-provisionado, get-or-create, ver
 * `./shared.ts#getOrCreatePersonalDeck`).
 *
 * IDEMPOTENTE: cada questão errada só vira UM cartão, mesmo chamando esta função várias vezes —
 * a marcação reservada `src:error:<questionId>` (`./shared.ts#errorSourceTag`) no cartão já
 * criado é o que permite detectar "esta questão já foi importada" sem exigir uma coluna nova no
 * schema (`Flashcard` não guarda `sourceQuestionId`, ver `docs/FLASHCARDS.md`). Retorna o estado
 * ATUAL completo do baralho (cartões antigos + novos), não só os recém-criados.
 *
 * Autorização (ADR-0006): `requireUser` + `assertOwnership`.
 */
export async function createFromErrors(userId: string, now: Date = new Date()): Promise<FlashcardDTO[]> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();

  const attempts = await repos.questionAttempts.listByUserId(userId);
  const wrongQuestionIds = [...new Set(attempts.filter((attempt) => attempt.isCorrect === false).map((attempt) => attempt.questionId))];

  const deck = await getOrCreatePersonalDeck(userId, "ERRORS", ERRORS_DECK_TITLE, now);
  const existingCards = await repos.flashcards.listByDeckId(deck.id);
  const alreadyImported = new Set(
    existingCards.flatMap((card) => card.tags.filter((tag) => tag.startsWith("src:error:"))),
  );

  for (const questionId of wrongQuestionIds) {
    const tag = errorSourceTag(questionId);
    if (alreadyImported.has(tag)) continue; // já importada — nunca duplica (idempotente).

    const question = await repos.questions.findById(questionId);
    if (!question) continue; // questão removida/inexistente — nada a importar para ela.

    const options = await repos.questionOptions.listByQuestionId(questionId);
    const correctOption = options.find((option) => option.isCorrect);

    const answer = correctOption
      ? question.explanation
        ? `${correctOption.text} — ${question.explanation}`
        : correctOption.text
      : (question.explanation ?? "Ver gabarito no caderno de erros.");

    await repos.flashcards.create({
      deckId: deck.id,
      subjectId: question.subjectId,
      topicId: question.topicId,
      question: question.statement,
      answer,
      difficulty: question.difficulty,
      tags: [tag],
      now,
    });
  }

  auditLog({
    operation: "flashcards.create-from-errors",
    userId,
    entity: "FlashcardDeck",
    entityId: deck.id,
    result: "success",
    correlationId: deck.id,
    metadata: { wrongQuestionCount: wrongQuestionIds.length },
  });

  const finalCards = await repos.flashcards.listByDeckId(deck.id);
  return toFlashcardDTOs(finalCards, userId, now);
}
