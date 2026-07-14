"use server";

import { z } from "zod";
import {
  confirmDeleteInputSchema,
  createLessonInputSchema,
  linkLessonVideoInputSchema,
  reorderLessonsInputSchema,
  updateLessonInputSchema,
  type AdminLessonDTO,
} from "@/contracts/admin-content";
import { idSchema, ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import {
  archiveLessonForAdmin,
  createLessonForAdmin,
  linkLessonVideoForAdmin,
  listLessonsForAdmin,
  reorderLessonsForAdmin,
  updateLessonForAdmin,
} from "@/server/services/admin/lesson-service";
import { toActionError } from "./shared";

/** Server Actions finas (docs/ARCHITECTURE.md §6) — CRUD administrativo de Aulas + "vincular vídeo". */

const listLessonsInputSchema = z.object({ moduleId: idSchema });

export async function listLessonsForAdminAction(rawInput: unknown): Promise<ActionResult<AdminLessonDTO[]>> {
  try {
    const input = parseInput(listLessonsInputSchema, rawInput);
    const lessons = await listLessonsForAdmin(input.moduleId);
    return ok(lessons);
  } catch (error) {
    return toActionError(error);
  }
}

export async function createLessonForAdminAction(rawInput: unknown): Promise<ActionResult<AdminLessonDTO>> {
  try {
    const input = parseInput(createLessonInputSchema, rawInput);
    const created = await createLessonForAdmin(input, new Date());
    return ok(created);
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateLessonForAdminAction(rawInput: unknown): Promise<ActionResult<AdminLessonDTO>> {
  try {
    const input = parseInput(updateLessonInputSchema, rawInput);
    const updated = await updateLessonForAdmin(input, new Date());
    return ok(updated);
  } catch (error) {
    return toActionError(error);
  }
}

/** "Vincular vídeo" — item explícito do escopo da Fase 17. */
export async function linkLessonVideoForAdminAction(rawInput: unknown): Promise<ActionResult<AdminLessonDTO>> {
  try {
    const input = parseInput(linkLessonVideoInputSchema, rawInput);
    const updated = await linkLessonVideoForAdmin(input, new Date());
    return ok(updated);
  } catch (error) {
    return toActionError(error);
  }
}

/** Operação DESTRUTIVA (soft-delete) — exige `confirm: true` explícito; só `admin`. */
export async function archiveLessonForAdminAction(rawInput: unknown): Promise<ActionResult<AdminLessonDTO>> {
  try {
    const input = parseInput(confirmDeleteInputSchema, rawInput);
    const archived = await archiveLessonForAdmin(input.id, new Date());
    return ok(archived);
  } catch (error) {
    return toActionError(error);
  }
}

export async function reorderLessonsForAdminAction(rawInput: unknown): Promise<ActionResult<AdminLessonDTO[]>> {
  try {
    const input = parseInput(reorderLessonsInputSchema, rawInput);
    const reordered = await reorderLessonsForAdmin(input, new Date());
    return ok(reordered);
  } catch (error) {
    return toActionError(error);
  }
}
