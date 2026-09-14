"use server";

import { FLASHCARDS } from "@/config/business";
import { fail, ok, type ActionResult } from "@/contracts/common";
import {
  createDeckInputSchema,
  createFlashcardInputSchema,
  flashcardIdInputSchema,
  getReviewSessionInputSchema,
  reviewCardInputSchema,
  type DeckDTO,
  type FlashcardDTO,
  type FlashcardFavoriteResultDTO,
  type RetentionStatsDTO,
  type ReviewSessionDTO,
} from "@/contracts/flashcards";
import { requireUser } from "@/server/authorization";
import { isDomainError, ValidationError } from "@/server/errors";
import {
  assertSharedReviewCardRateLimit,
  createCard,
  createDeck,
  createFromErrors,
  createFromNotes,
  getRetentionStats,
  getReviewSession,
  listDecks,
  reviewCard,
  toggleFavorite,
} from "@/server/services/flashcards";
import { parseInput } from "@/server/validation";

/**
 * Server Actions finas (docs/ARCHITECTURE.md §6) do domínio "Flashcards" (Fase 14 — agente
 * `backend`): resolvem o usuário autenticado a partir da sessão real do Auth.js (nunca de um
 * `userId` vindo do cliente), validam a entrada com Zod e repassam para o service. Mesmo padrão
 * de `@/server/actions/brainstorm.ts`.
 */

function toActionError(error: unknown): ActionResult<never> {
  if (isDomainError(error)) {
    const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
    return fail(error.code, error.message, fieldErrors);
  }
  return fail("INTERNAL_ERROR", "Não foi possível processar a solicitação.");
}

/** Lista os baralhos acessíveis (matéria + pessoais + favoritos) do aluno autenticado. */
export async function listDecksAction(): Promise<ActionResult<DeckDTO[]>> {
  try {
    const session = await requireUser();
    const decks = await listDecks(session.userId);
    return ok(decks);
  } catch (error) {
    return toActionError(error);
  }
}

/** Monta a sessão de revisão (cartões devidos) — `deckId` omitido agrega todos os baralhos. */
export async function getReviewSessionAction(
  rawInput: unknown,
): Promise<ActionResult<ReviewSessionDTO>> {
  try {
    const input = parseInput(getReviewSessionInputSchema, rawInput);
    const session = await requireUser();
    const reviewSession = await getReviewSession(session.userId, input.deckId);
    return ok(reviewSession);
  } catch (error) {
    return toActionError(error);
  }
}

/** Registra a classificação (Errei/Difícil/Médio/Fácil) de uma revisão de flashcard. */
export async function reviewCardAction(rawInput: unknown): Promise<ActionResult<FlashcardDTO>> {
  try {
    const input = parseInput(reviewCardInputSchema, rawInput);
    const session = await requireUser();
    // Rate limit leve por (usuário, cartão) — defesa em profundidade do achado A1 (a barreira
    // principal contra farm por corrida é o mutex + gate no service).
    await assertSharedReviewCardRateLimit(
      session.userId,
      input.flashcardId,
      FLASHCARDS.reviewCardMinIntervalMs,
    );
    const card = await reviewCard(session.userId, input.flashcardId, input.rating);
    return ok(card);
  } catch (error) {
    return toActionError(error);
  }
}

/** Cria um baralho pessoal para o aluno autenticado. */
export async function createDeckAction(rawInput: unknown): Promise<ActionResult<DeckDTO>> {
  try {
    const input = parseInput(createDeckInputSchema, rawInput);
    const session = await requireUser();
    const deck = await createDeck(session.userId, input);
    return ok(deck);
  } catch (error) {
    return toActionError(error);
  }
}

/** Cria um cartão num baralho próprio do aluno autenticado. */
export async function createCardAction(rawInput: unknown): Promise<ActionResult<FlashcardDTO>> {
  try {
    const input = parseInput(createFlashcardInputSchema, rawInput);
    const session = await requireUser();
    const card = await createCard(session.userId, input);
    return ok(card);
  } catch (error) {
    return toActionError(error);
  }
}

/** Importa flashcards a partir do caderno de erros de simulados (idempotente). */
export async function createFromErrorsAction(): Promise<ActionResult<FlashcardDTO[]>> {
  try {
    const session = await requireUser();
    const cards = await createFromErrors(session.userId);
    return ok(cards);
  } catch (error) {
    return toActionError(error);
  }
}

/** Importa flashcards a partir dos rascunhos do brainstorm (idempotente). */
export async function createFromNotesAction(): Promise<ActionResult<FlashcardDTO[]>> {
  try {
    const session = await requireUser();
    const cards = await createFromNotes(session.userId);
    return ok(cards);
  } catch (error) {
    return toActionError(error);
  }
}

/** Favorita/desfavorita um cartão para o aluno autenticado. */
export async function toggleFavoriteAction(
  rawInput: unknown,
): Promise<ActionResult<FlashcardFavoriteResultDTO>> {
  try {
    const input = parseInput(flashcardIdInputSchema, rawInput);
    const session = await requireUser();
    const result = await toggleFavorite(session.userId, input.flashcardId);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

/** Estatísticas de retenção do aluno autenticado. */
export async function getRetentionStatsAction(): Promise<ActionResult<RetentionStatsDTO>> {
  try {
    const session = await requireUser();
    const stats = await getRetentionStats(session.userId);
    return ok(stats);
  } catch (error) {
    return toActionError(error);
  }
}
