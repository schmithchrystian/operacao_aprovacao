"use server";

import {
  confirmDeleteInputSchema,
  createCourseInputSchema,
  updateCourseInputSchema,
  type AdminCourseDTO,
} from "@/contracts/admin-content";
import { ok, type ActionResult } from "@/contracts/common";
import {
  archiveCourseForAdmin,
  createCourseForAdmin,
  listCoursesForAdmin,
  updateCourseForAdmin,
} from "@/server/services/admin/course-service";
import { parseInput } from "@/server/validation";
import { toActionError } from "./shared";

/** Server Actions finas (docs/ARCHITECTURE.md §6) — CRUD administrativo de Cursos. */

export async function listCoursesForAdminAction(): Promise<ActionResult<AdminCourseDTO[]>> {
  try {
    const courses = await listCoursesForAdmin();
    return ok(courses);
  } catch (error) {
    return toActionError(error);
  }
}

export async function createCourseForAdminAction(rawInput: unknown): Promise<ActionResult<AdminCourseDTO>> {
  try {
    const input = parseInput(createCourseInputSchema, rawInput);
    const created = await createCourseForAdmin(input, new Date());
    return ok(created);
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCourseForAdminAction(rawInput: unknown): Promise<ActionResult<AdminCourseDTO>> {
  try {
    const input = parseInput(updateCourseInputSchema, rawInput);
    const updated = await updateCourseForAdmin(input, new Date());
    return ok(updated);
  } catch (error) {
    return toActionError(error);
  }
}

/** Operação DESTRUTIVA (soft-delete) — exige `confirm: true` explícito; só `admin`. */
export async function archiveCourseForAdminAction(rawInput: unknown): Promise<ActionResult<AdminCourseDTO>> {
  try {
    const input = parseInput(confirmDeleteInputSchema, rawInput);
    const archived = await archiveCourseForAdmin(input.id, new Date());
    return ok(archived);
  } catch (error) {
    return toActionError(error);
  }
}
