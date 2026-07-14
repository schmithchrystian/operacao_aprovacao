"use server";

import {
  confirmDeleteInputSchema,
  createContestInputSchema,
  updateContestInputSchema,
  type AdminContestDTO,
} from "@/contracts/admin-content";
import { ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import {
  archiveContestForAdmin,
  createContestForAdmin,
  listContestsForAdmin,
  updateContestForAdmin,
} from "@/server/services/admin/contest-service";
import { toActionError } from "./shared";

/** Server Actions finas — Concursos (escopo "ao menos create/list", Fase 17). */

export async function listContestsForAdminAction(): Promise<ActionResult<AdminContestDTO[]>> {
  try {
    return ok(await listContestsForAdmin());
  } catch (error) {
    return toActionError(error);
  }
}

export async function createContestForAdminAction(rawInput: unknown): Promise<ActionResult<AdminContestDTO>> {
  try {
    const input = parseInput(createContestInputSchema, rawInput);
    return ok(await createContestForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateContestForAdminAction(rawInput: unknown): Promise<ActionResult<AdminContestDTO>> {
  try {
    const input = parseInput(updateContestInputSchema, rawInput);
    return ok(await updateContestForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveContestForAdminAction(rawInput: unknown): Promise<ActionResult<AdminContestDTO>> {
  try {
    const input = parseInput(confirmDeleteInputSchema, rawInput);
    return ok(await archiveContestForAdmin(input.id, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}
