"use server";

import { fail, ok, type ActionResult } from "@/contracts/common";
import {
  generatePlanInputSchema,
  reorderPlanItemsInputSchema,
  updatePlanItemInputSchema,
  type StudyPlanDTO,
  type StudyPlanItemDTO,
} from "@/contracts/study-plan";
import {
  buildSessionInputSchema,
  type GeneratedSessionDTO,
  type StartStudyMissionResultDTO,
} from "@/contracts/study-session";
import { requireUser } from "@/server/authorization";
import { isDomainError, ValidationError } from "@/server/errors";
import {
  buildSession,
  generatePlan,
  getPlan,
  reorderPlanItems,
  startStudyMission,
  updatePlanItem,
} from "@/server/services/study-plan";
import { parseInput } from "@/server/validation";

/**
 * Server Actions finas (docs/ARCHITECTURE.md §6) de "Montar estudo" + "Plano de estudos"
 * (Fase 11 — agente `study-tracking`): resolvem o usuário autenticado a partir da sessão real
 * do Auth.js (nunca de um `userId` vindo do cliente), validam a entrada com Zod e repassam
 * para o service. Mesmo padrão de `@/server/actions/simulations.ts`/`@/server/actions/courses.ts`.
 */

function toActionError(error: unknown): ActionResult<never> {
  if (isDomainError(error)) {
    const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
    return fail(error.code, error.message, fieldErrors);
  }
  return fail("INTERNAL_ERROR", "Não foi possível processar a solicitação.");
}

/** Pré-visualiza uma sessão de estudo gerada a partir do tempo disponível + preferências —
 *  não grava nada (só leitura de conteúdo real dos mocks). */
export async function buildSessionAction(rawInput: unknown): Promise<ActionResult<GeneratedSessionDTO>> {
  try {
    const input = parseInput(buildSessionInputSchema, rawInput);
    const session = await requireUser();
    const generated = await buildSession(session.userId, input);
    return ok(generated);
  } catch (error) {
    return toActionError(error);
  }
}

/** Inicia a missão de estudo: registra a sessão gerada e devolve o ponto de partida (1º bloco). */
export async function startStudyMissionAction(
  rawInput: unknown,
): Promise<ActionResult<StartStudyMissionResultDTO>> {
  try {
    const input = parseInput(buildSessionInputSchema, rawInput);
    const session = await requireUser();
    const result = await startStudyMission(session.userId, input);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

/** Gera (ou regenera, substituindo os itens) o plano de estudos ativo do aluno autenticado. */
export async function generatePlanAction(rawInput: unknown): Promise<ActionResult<StudyPlanDTO>> {
  try {
    const input = parseInput(generatePlanInputSchema, rawInput);
    const session = await requireUser();
    const plan = await generatePlan(session.userId, input);
    return ok(plan);
  } catch (error) {
    return toActionError(error);
  }
}

/** Lê o plano de estudos ativo do aluno autenticado — `data: null` quando ainda não existe. */
export async function getPlanAction(): Promise<ActionResult<StudyPlanDTO | null>> {
  try {
    const session = await requireUser();
    const plan = await getPlan(session.userId);
    return ok(plan);
  } catch (error) {
    return toActionError(error);
  }
}

/** Atualiza um item do plano (status, data alvo, minutos estimados e/ou título). */
export async function updatePlanItemAction(rawInput: unknown): Promise<ActionResult<StudyPlanItemDTO>> {
  try {
    const input = parseInput(updatePlanItemInputSchema, rawInput);
    const session = await requireUser();
    const item = await updatePlanItem(session.userId, input);
    return ok(item);
  } catch (error) {
    return toActionError(error);
  }
}

/** Persiste a nova ordem dos itens do plano (drag-and-drop). */
export async function reorderPlanItemsAction(rawInput: unknown): Promise<ActionResult<StudyPlanItemDTO[]>> {
  try {
    const input = parseInput(reorderPlanItemsInputSchema, rawInput);
    const session = await requireUser();
    const items = await reorderPlanItems(session.userId, input);
    return ok(items);
  } catch (error) {
    return toActionError(error);
  }
}
