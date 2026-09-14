"use server";

import { reserveInterval } from "@/server/concurrency/rate-limit";
import { RateLimitError } from "@/server/errors";

import { SIMULATIONS } from "@/config/business";
import { fail, ok, type ActionResult } from "@/contracts/common";
import {
  attemptIdInputSchema,
  listTopicOptionsInputSchema,
  mockExamConfigInputSchema,
  submitAnswersInputSchema,
  toggleFavoriteInputSchema,
  type AttemptDTO,
  type AttemptResultDTO,
  type AttemptStatusDTO,
  type ErrorNotebookDTO,
  type FavoriteQuestionDTO,
  type FavoriteResultDTO,
  type HistoryItemDTO,
  type MockExamCatalogItemDTO,
  type SubjectOptionDTO,
  type TopicOptionDTO,
} from "@/contracts/simulations";
import { requireUser } from "@/server/authorization";
import { isDomainError, ValidationError } from "@/server/errors";
import { parseInput } from "@/server/validation";
import {
  assertSimulationsRateLimit,
  createAttempt,
  getAttemptForTaking,
  getAttemptStatus,
  getErrorNotebook,
  getHistory,
  getResult,
  listFavorites,
  listMockExamCatalog,
  listSubjectOptions,
  listTopicOptions,
  submitAndFinalize,
  toggleFavorite,
} from "@/server/services/simulations";

/**
 * Server Actions finas (docs/ARCHITECTURE.md §6) do domínio de simulados: resolvem o usuário
 * autenticado a partir da sessão real do Auth.js (nunca de um `userId` vindo do cliente),
 * validam a entrada com Zod e repassam para o service. Mesmo padrão de
 * `@/server/actions/courses.ts`/`@/server/actions/progress.ts`.
 */

function toActionError(error: unknown): ActionResult<never> {
  if (isDomainError(error)) {
    const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
    return fail(error.code, error.message, fieldErrors);
  }
  return fail("INTERNAL_ERROR", "Não foi possível processar a solicitação.");
}

/** Cria uma nova tentativa de simulado (completo ou personalizado por filtros) para o aluno autenticado. */
export async function createAttemptAction(rawInput?: unknown): Promise<ActionResult<AttemptDTO>> {
  try {
    const input = parseInput(mockExamConfigInputSchema, rawInput ?? {});
    const session = await requireUser();
    // Rate limit leve (CLAUDE.md §24): `createAttempt` grava um registro (e, no modo
    // personalizado, um `MockExam` ad-hoc) por chamada — barra spam antes de tocar o service.
    await assertSharedSimulationsRateLimit(session.userId, "create-attempt", SIMULATIONS.createAttemptMinIntervalMs);
    const attempt = await createAttempt(session.userId, input);
    return ok(attempt);
  } catch (error) {
    return toActionError(error);
  }
}

/** Envia as respostas e finaliza a tentativa — correção 100% no servidor (CLAUDE.md §18). */
export async function submitAttemptAction(rawInput: unknown): Promise<ActionResult<AttemptResultDTO>> {
  try {
    const input = parseInput(submitAnswersInputSchema, rawInput);
    const session = await requireUser();
    await assertSharedSimulationsRateLimit(session.userId, "submit-attempt", SIMULATIONS.submitAttemptMinIntervalMs);
    const result = await submitAndFinalize(session.userId, input);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

/** Lê uma tentativa em andamento (sem gabarito) para o aluno continuar respondendo. */
export async function getAttemptAction(rawInput: unknown): Promise<ActionResult<AttemptDTO>> {
  try {
    const input = parseInput(attemptIdInputSchema, rawInput);
    const session = await requireUser();
    const attempt = await getAttemptForTaking(session.userId, input.attemptId);
    return ok(attempt);
  } catch (error) {
    return toActionError(error);
  }
}

/** Lê o resultado (gabarito + métricas) de uma tentativa já finalizada. */
export async function getResultAction(rawInput: unknown): Promise<ActionResult<AttemptResultDTO>> {
  try {
    const input = parseInput(attemptIdInputSchema, rawInput);
    const session = await requireUser();
    const result = await getResult(session.userId, input.attemptId);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Lê apenas o status (+ metadados não sensíveis, sem gabarito) de uma tentativa. As telas usam
 * para rotear por status explícito e renderizar o estado terminal de tentativas EXPIRED/CANCELLED
 * sem cair em loop de redirect (achado de segurança Fase 10 — MÉDIO).
 */
export async function getAttemptStatusAction(rawInput: unknown): Promise<ActionResult<AttemptStatusDTO>> {
  try {
    const input = parseInput(attemptIdInputSchema, rawInput);
    const session = await requireUser();
    const status = await getAttemptStatus(session.userId, input.attemptId);
    return ok(status);
  } catch (error) {
    return toActionError(error);
  }
}

/** Alterna o favorito de uma questão para o aluno autenticado. */
export async function toggleFavoriteAction(rawInput: unknown): Promise<ActionResult<FavoriteResultDTO>> {
  try {
    const input = parseInput(toggleFavoriteInputSchema, rawInput);
    const session = await requireUser();
    const result = await toggleFavorite(session.userId, input.questionId);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

/** Histórico de tentativas do aluno autenticado. */
export async function getHistoryAction(): Promise<ActionResult<HistoryItemDTO[]>> {
  try {
    const session = await requireUser();
    const history = await getHistory(session.userId);
    return ok(history);
  } catch (error) {
    return toActionError(error);
  }
}

/** Caderno de erros do aluno autenticado. */
export async function getErrorNotebookAction(): Promise<ActionResult<ErrorNotebookDTO>> {
  try {
    const session = await requireUser();
    const notebook = await getErrorNotebook(session.userId);
    return ok(notebook);
  } catch (error) {
    return toActionError(error);
  }
}

/** Questões favoritadas do aluno autenticado (usado pela página "Favoritos"). */
export async function listFavoritesAction(): Promise<ActionResult<FavoriteQuestionDTO[]>> {
  try {
    const session = await requireUser();
    const favorites = await listFavorites(session.userId);
    return ok(favorites);
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Catálogo de simulados prontos (publicados) — "simulado completo"/"por matéria" pré-montados,
 * para o hub de simulados. Dado público de catálogo: exige apenas sessão autenticada, sem
 * `assertOwnership` (não pertence a um usuário específico).
 */
export async function listMockExamCatalogAction(): Promise<ActionResult<MockExamCatalogItemDTO[]>> {
  try {
    await requireUser();
    const catalog = await listMockExamCatalog();
    return ok(catalog);
  } catch (error) {
    return toActionError(error);
  }
}

/** Matérias disponíveis para o filtro "matéria" do formulário de simulado personalizado. */
export async function listSubjectOptionsAction(): Promise<ActionResult<SubjectOptionDTO[]>> {
  try {
    await requireUser();
    const subjects = await listSubjectOptions();
    return ok(subjects);
  } catch (error) {
    return toActionError(error);
  }
}

/** Assuntos de uma matéria (dependente da matéria selecionada), para o filtro "assunto". */
export async function listTopicOptionsAction(rawInput: unknown): Promise<ActionResult<TopicOptionDTO[]>> {
  try {
    const input = parseInput(listTopicOptionsInputSchema, rawInput);
    await requireUser();
    const topics = await listTopicOptions(input.subjectId);
    return ok(topics);
  } catch (error) {
    return toActionError(error);
  }
}

async function assertSharedSimulationsRateLimit(userId: string, action: "create-attempt" | "submit-attempt", interval: number) {
  if (!await reserveInterval(`simulations:${userId}:${action}`, interval, () => { assertSimulationsRateLimit(userId, action, interval); return true; })) throw new RateLimitError("Muitas solicitações. Aguarde alguns instantes.");
}
