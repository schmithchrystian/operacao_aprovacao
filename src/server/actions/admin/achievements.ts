"use server";

import {
  confirmDeleteInputSchema,
  createAchievementInputSchema,
  updateAchievementInputSchema,
  type AdminAchievementDTO,
} from "@/contracts/admin-content";
import { ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import {
  archiveAchievementForAdmin,
  createAchievementForAdmin,
  listAchievementsForAdmin,
  updateAchievementForAdmin,
} from "@/server/services/admin/achievement-service";
import { toActionError } from "./shared";

/** Server Actions finas — CRUD administrativo de Conquistas (caminho vertical priorizado). */

export async function listAchievementsForAdminAction(): Promise<ActionResult<AdminAchievementDTO[]>> {
  try {
    return ok(await listAchievementsForAdmin());
  } catch (error) {
    return toActionError(error);
  }
}

export async function createAchievementForAdminAction(
  rawInput: unknown,
): Promise<ActionResult<AdminAchievementDTO>> {
  try {
    const input = parseInput(createAchievementInputSchema, rawInput);
    return ok(await createAchievementForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateAchievementForAdminAction(
  rawInput: unknown,
): Promise<ActionResult<AdminAchievementDTO>> {
  try {
    const input = parseInput(updateAchievementInputSchema, rawInput);
    return ok(await updateAchievementForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

/** Operação DESTRUTIVA (soft-delete) — exige `confirm: true` explícito; só `admin`. */
export async function archiveAchievementForAdminAction(
  rawInput: unknown,
): Promise<ActionResult<AdminAchievementDTO>> {
  try {
    const input = parseInput(confirmDeleteInputSchema, rawInput);
    return ok(await archiveAchievementForAdmin(input.id, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}
