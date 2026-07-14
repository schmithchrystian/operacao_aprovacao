"use server";

import {
  confirmDeleteInputSchema,
  createTopicInputSchema,
  updateTopicInputSchema,
  type AdminTopicDTO,
} from "@/contracts/admin-content";
import { ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import {
  archiveTopicForAdmin,
  createTopicForAdmin,
  listTopicsForAdmin,
  updateTopicForAdmin,
} from "@/server/services/admin/topic-service";
import { toActionError } from "./shared";

/** Server Actions finas — Assuntos (Fase 17, "cadastrar/editar"). */

export async function listTopicsForAdminAction(): Promise<ActionResult<AdminTopicDTO[]>> {
  try {
    return ok(await listTopicsForAdmin());
  } catch (error) {
    return toActionError(error);
  }
}

export async function createTopicForAdminAction(rawInput: unknown): Promise<ActionResult<AdminTopicDTO>> {
  try {
    const input = parseInput(createTopicInputSchema, rawInput);
    return ok(await createTopicForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTopicForAdminAction(rawInput: unknown): Promise<ActionResult<AdminTopicDTO>> {
  try {
    const input = parseInput(updateTopicInputSchema, rawInput);
    return ok(await updateTopicForAdmin(input, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveTopicForAdminAction(rawInput: unknown): Promise<ActionResult<AdminTopicDTO>> {
  try {
    const input = parseInput(confirmDeleteInputSchema, rawInput);
    return ok(await archiveTopicForAdmin(input.id, new Date()));
  } catch (error) {
    return toActionError(error);
  }
}
