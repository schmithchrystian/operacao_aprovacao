"use server";

import { updateBusinessConfigInputSchema, type AdminBusinessConfigDTO } from "@/contracts/admin-config";
import { ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import { getBusinessConfigForAdmin, updateBusinessConfigForAdmin } from "@/server/services/admin/config-service";
import { toActionError } from "./shared";

/** Server Actions finas — Configuração (pontuação/níveis/pesos de ranking). Só `admin`. */

export async function getBusinessConfigForAdminAction(): Promise<ActionResult<AdminBusinessConfigDTO>> {
  try {
    return ok(await getBusinessConfigForAdmin());
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateBusinessConfigForAdminAction(
  rawInput: unknown,
): Promise<ActionResult<AdminBusinessConfigDTO>> {
  try {
    const input = parseInput(updateBusinessConfigInputSchema, rawInput);
    return ok(await updateBusinessConfigForAdmin(input));
  } catch (error) {
    return toActionError(error);
  }
}
