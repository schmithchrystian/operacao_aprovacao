"use server";

import { z } from "zod";
import {
  confirmDeleteInputSchema,
  createModuleInputSchema,
  reorderModulesInputSchema,
  updateModuleInputSchema,
  type AdminModuleDTO,
} from "@/contracts/admin-content";
import { idSchema, ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import {
  archiveModuleForAdmin,
  createModuleForAdmin,
  listModulesForAdmin,
  reorderModulesForAdmin,
  updateModuleForAdmin,
} from "@/server/services/admin/module-service";
import { toActionError } from "./shared";

/** Server Actions finas (docs/ARCHITECTURE.md §6) — CRUD administrativo de Módulos. */

const listModulesInputSchema = z.object({ courseId: idSchema });

export async function listModulesForAdminAction(rawInput: unknown): Promise<ActionResult<AdminModuleDTO[]>> {
  try {
    const input = parseInput(listModulesInputSchema, rawInput);
    const modules = await listModulesForAdmin(input.courseId);
    return ok(modules);
  } catch (error) {
    return toActionError(error);
  }
}

export async function createModuleForAdminAction(rawInput: unknown): Promise<ActionResult<AdminModuleDTO>> {
  try {
    const input = parseInput(createModuleInputSchema, rawInput);
    const created = await createModuleForAdmin(input, new Date());
    return ok(created);
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateModuleForAdminAction(rawInput: unknown): Promise<ActionResult<AdminModuleDTO>> {
  try {
    const input = parseInput(updateModuleInputSchema, rawInput);
    const updated = await updateModuleForAdmin(input, new Date());
    return ok(updated);
  } catch (error) {
    return toActionError(error);
  }
}

/** Operação DESTRUTIVA (soft-delete) — exige `confirm: true` explícito; só `admin`. */
export async function archiveModuleForAdminAction(rawInput: unknown): Promise<ActionResult<AdminModuleDTO>> {
  try {
    const input = parseInput(confirmDeleteInputSchema, rawInput);
    const archived = await archiveModuleForAdmin(input.id, new Date());
    return ok(archived);
  } catch (error) {
    return toActionError(error);
  }
}

export async function reorderModulesForAdminAction(rawInput: unknown): Promise<ActionResult<AdminModuleDTO[]>> {
  try {
    const input = parseInput(reorderModulesInputSchema, rawInput);
    const reordered = await reorderModulesForAdmin(input, new Date());
    return ok(reordered);
  } catch (error) {
    return toActionError(error);
  }
}
