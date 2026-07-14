"use server";

import {
  changeUserRoleInputSchema,
  setUserActiveInputSchema,
  type AdminUserDTO,
} from "@/contracts/admin-users";
import { ok, type ActionResult } from "@/contracts/common";
import { changeUserRoleForAdmin, setUserActiveForAdmin } from "@/server/services/admin/users-service";
import { parseInput } from "@/server/validation";
import { toActionError } from "./shared";

/**
 * Server Actions finas (docs/ARCHITECTURE.md §6) — gestão de usuários. `listUsersForAdminAction`
 * já existe em `./list-users.ts` (Fase 4).
 */

/** SENSÍVEL — só `admin` (verificado no service via `withAdminAudit`). */
export async function changeUserRoleAction(rawInput: unknown): Promise<ActionResult<AdminUserDTO>> {
  try {
    const input = parseInput(changeUserRoleInputSchema, rawInput);
    const updated = await changeUserRoleForAdmin(input);
    return ok(updated);
  } catch (error) {
    return toActionError(error);
  }
}

export async function setUserActiveAction(rawInput: unknown): Promise<ActionResult<AdminUserDTO>> {
  try {
    const input = parseInput(setUserActiveInputSchema, rawInput);
    const updated = await setUserActiveForAdmin(input);
    return ok(updated);
  } catch (error) {
    return toActionError(error);
  }
}
