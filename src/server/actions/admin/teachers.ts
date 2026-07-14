"use server";

import {
  confirmDeleteInputSchema,
  createTeacherInputSchema,
  updateTeacherInputSchema,
  type AdminTeacherDTO,
} from "@/contracts/admin-content";
import { ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import {
  archiveTeacherForAdmin,
  createTeacherForAdmin,
  listTeachersForAdmin,
  updateTeacherForAdmin,
} from "@/server/services/admin/teacher-service";
import { toActionError } from "./shared";

/** Server Actions finas — Professores (Fase 17, "cadastrar/editar"). */

export async function listTeachersForAdminAction(): Promise<ActionResult<AdminTeacherDTO[]>> {
  try {
    return ok(await listTeachersForAdmin());
  } catch (error) {
    return toActionError(error);
  }
}

export async function createTeacherForAdminAction(rawInput: unknown): Promise<ActionResult<AdminTeacherDTO>> {
  try {
    const input = parseInput(createTeacherInputSchema, rawInput);
    return ok(await createTeacherForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTeacherForAdminAction(rawInput: unknown): Promise<ActionResult<AdminTeacherDTO>> {
  try {
    const input = parseInput(updateTeacherInputSchema, rawInput);
    return ok(await updateTeacherForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveTeacherForAdminAction(rawInput: unknown): Promise<ActionResult<AdminTeacherDTO>> {
  try {
    const input = parseInput(confirmDeleteInputSchema, rawInput);
    return ok(await archiveTeacherForAdmin(input.id, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}
