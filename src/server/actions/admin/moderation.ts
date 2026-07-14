"use server";

import { moderateContentInputSchema } from "@/contracts/admin-notifications";
import { ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import { moderateContentForAdmin } from "@/server/services/admin/moderation-service";
import { toActionError } from "./shared";

/** Server Action fina — moderar visibilidade de conteúdo (ocultar/reexibir Curso/Questão). */
export async function moderateContentAction(rawInput: unknown): Promise<ActionResult<{ hidden: boolean }>> {
  try {
    const input = parseInput(moderateContentInputSchema, rawInput);
    const result = await moderateContentForAdmin(input, new Date());
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}
