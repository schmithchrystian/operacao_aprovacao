"use server";

import type { AdminDashboardDTO } from "@/contracts/admin-dashboard";
import { ok, type ActionResult } from "@/contracts/common";
import { getAdminDashboard } from "@/server/services/admin/dashboard-service";
import { toActionError } from "./shared";

/** Server Action fina (docs/ARCHITECTURE.md §6) — dashboard administrativo (admin + moderador). */
export async function getAdminDashboardAction(): Promise<ActionResult<AdminDashboardDTO>> {
  try {
    const dashboard = await getAdminDashboard(new Date());
    return ok(dashboard);
  } catch (error) {
    return toActionError(error);
  }
}
