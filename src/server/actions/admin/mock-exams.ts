"use server";

import {
  confirmDeleteInputSchema,
  createMockExamInputSchema,
  updateMockExamInputSchema,
  type AdminMockExamDTO,
} from "@/contracts/admin-content";
import { ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import {
  archiveMockExamForAdmin,
  createMockExamForAdmin,
  listMockExamsForAdmin,
  updateMockExamForAdmin,
} from "@/server/services/admin/mock-exam-service";
import { toActionError } from "./shared";

/** Server Actions finas — CRUD administrativo de Simulados de catálogo. */

export async function listMockExamsForAdminAction(): Promise<ActionResult<AdminMockExamDTO[]>> {
  try {
    return ok(await listMockExamsForAdmin());
  } catch (error) {
    return toActionError(error);
  }
}

export async function createMockExamForAdminAction(rawInput: unknown): Promise<ActionResult<AdminMockExamDTO>> {
  try {
    const input = parseInput(createMockExamInputSchema, rawInput);
    return ok(await createMockExamForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateMockExamForAdminAction(rawInput: unknown): Promise<ActionResult<AdminMockExamDTO>> {
  try {
    const input = parseInput(updateMockExamInputSchema, rawInput);
    return ok(await updateMockExamForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveMockExamForAdminAction(rawInput: unknown): Promise<ActionResult<AdminMockExamDTO>> {
  try {
    const input = parseInput(confirmDeleteInputSchema, rawInput);
    return ok(await archiveMockExamForAdmin(input.id, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}
