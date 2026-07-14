"use server";

import { listAuditLogInputSchema, type AuditLogPageDTO } from "@/contracts/admin-audit";
import { ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import { listAuditLogForAdmin } from "@/server/services/admin/audit-service";
import { toActionError } from "./shared";

/** Server Action fina — visualizar log de auditoria. Só `admin`. */
export async function listAuditLogAction(rawInput?: unknown): Promise<ActionResult<AuditLogPageDTO>> {
  try {
    const input = parseInput(listAuditLogInputSchema, rawInput ?? {});
    const page = await listAuditLogForAdmin(input);
    return ok(page);
  } catch (error) {
    return toActionError(error);
  }
}
