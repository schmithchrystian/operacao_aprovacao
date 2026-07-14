"use server";

import {
  confirmDeleteInputSchema,
  createQuestionInputSchema,
  updateQuestionInputSchema,
  type AdminQuestionDTO,
} from "@/contracts/admin-content";
import { ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import {
  archiveQuestionForAdmin,
  createQuestionForAdmin,
  listQuestionsForAdmin,
  updateQuestionForAdmin,
} from "@/server/services/admin/question-service";
import { toActionError } from "./shared";

/** Server Actions finas — CRUD administrativo de Questões (caminho vertical priorizado). */

export async function listQuestionsForAdminAction(): Promise<ActionResult<AdminQuestionDTO[]>> {
  try {
    return ok(await listQuestionsForAdmin());
  } catch (error) {
    return toActionError(error);
  }
}

export async function createQuestionForAdminAction(rawInput: unknown): Promise<ActionResult<AdminQuestionDTO>> {
  try {
    const input = parseInput(createQuestionInputSchema, rawInput);
    return ok(await createQuestionForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateQuestionForAdminAction(rawInput: unknown): Promise<ActionResult<AdminQuestionDTO>> {
  try {
    const input = parseInput(updateQuestionInputSchema, rawInput);
    return ok(await updateQuestionForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

/** Operação DESTRUTIVA (soft-delete) — exige `confirm: true` explícito; só `admin`. */
export async function archiveQuestionForAdminAction(rawInput: unknown): Promise<ActionResult<AdminQuestionDTO>> {
  try {
    const input = parseInput(confirmDeleteInputSchema, rawInput);
    return ok(await archiveQuestionForAdmin(input.id, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}
