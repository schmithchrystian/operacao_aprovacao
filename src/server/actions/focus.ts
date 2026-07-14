"use server";

import { fail, ok, type ActionResult } from "@/contracts/common";
import {
  finishFocusInputSchema,
  pomodoroConfigInputSchema,
  type FinishFocusResultDTO,
  type FocusSessionDTO,
} from "@/contracts/focus";
import { requireUser } from "@/server/authorization";
import { isDomainError, ValidationError } from "@/server/errors";
import { finishFocusSession, startFocusSession } from "@/server/services/focus";
import { parseInput } from "@/server/validation";

/**
 * Server Actions finas (docs/ARCHITECTURE.md §6) do Modo Foco/Pomodoro (Fase 15 — agente
 * `study-tracking`): resolvem o usuário autenticado a partir da sessão real do Auth.js (nunca de
 * um `userId` vindo do cliente), validam a entrada com Zod e repassam para o service. Mesmo
 * padrão de `@/server/actions/flashcards.ts`.
 *
 * DECISÃO Action vs Route Handler (docs/ARCHITECTURE.md §6): `startFocusSessionAction`/
 * `finishFocusSessionAction` são Server Actions — mutações disparadas por um botão/form
 * autenticado, cuja resposta é consumida pela mesma árvore React (iniciar/encerrar o timer). O
 * heartbeat do timer é, em vez disso, um Route Handler (`@/app/api/focus/heartbeat/route.ts`) —
 * alta frequência/telemetria, mesmo critério já aplicado ao heartbeat de vídeo
 * (`@/app/api/progress/heartbeat/route.ts`, Fase 7). Ambos chamam o MESMO service
 * (`@/server/services/focus`) — nenhuma regra duplicada entre as duas fronteiras.
 */
function toActionError(error: unknown): ActionResult<never> {
  if (isDomainError(error)) {
    const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
    return fail(error.code, error.message, fieldErrors);
  }
  return fail("INTERNAL_ERROR", "Não foi possível processar a solicitação.");
}

/** Inicia uma sessão de Modo Foco para o aluno autenticado (descarta qualquer sessão ativa anterior). */
export async function startFocusSessionAction(rawInput: unknown): Promise<ActionResult<FocusSessionDTO>> {
  try {
    const input = parseInput(pomodoroConfigInputSchema, rawInput);
    const session = await requireUser();
    const focusSession = await startFocusSession(session.userId, input);
    return ok(focusSession);
  } catch (error) {
    return toActionError(error);
  }
}

/** Finaliza a sessão de Modo Foco do aluno autenticado — só pontua com atividade real validada no servidor. */
export async function finishFocusSessionAction(rawInput: unknown): Promise<ActionResult<FinishFocusResultDTO>> {
  try {
    const input = parseInput(finishFocusInputSchema, rawInput);
    const session = await requireUser();
    const result = await finishFocusSession(session.userId, input);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}
