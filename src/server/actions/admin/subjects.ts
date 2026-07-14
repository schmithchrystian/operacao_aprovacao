"use server";

import {
  confirmDeleteInputSchema,
  createSubjectInputSchema,
  updateSubjectInputSchema,
  type AdminSubjectDTO,
} from "@/contracts/admin-content";
import { ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import {
  archiveSubjectForAdmin,
  createSubjectForAdmin,
  listSubjectsForAdmin,
  updateSubjectForAdmin,
} from "@/server/services/admin/subject-service";
import { toActionError } from "./shared";

/** Server Actions finas — Matérias (Fase 17, "cadastrar/editar"). */

export async function listSubjectsForAdminAction(): Promise<ActionResult<AdminSubjectDTO[]>> {
  try {
    return ok(await listSubjectsForAdmin());
  } catch (error) {
    return toActionError(error);
  }
}

export async function createSubjectForAdminAction(rawInput: unknown): Promise<ActionResult<AdminSubjectDTO>> {
  try {
    const input = parseInput(createSubjectInputSchema, rawInput);
    return ok(await createSubjectForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateSubjectForAdminAction(rawInput: unknown): Promise<ActionResult<AdminSubjectDTO>> {
  try {
    const input = parseInput(updateSubjectInputSchema, rawInput);
    return ok(await updateSubjectForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveSubjectForAdminAction(rawInput: unknown): Promise<ActionResult<AdminSubjectDTO>> {
  try {
    const input = parseInput(confirmDeleteInputSchema, rawInput);
    return ok(await archiveSubjectForAdmin(input.id, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}
