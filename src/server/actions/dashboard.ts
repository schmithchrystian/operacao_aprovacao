"use server";

import { fail, ok, type ActionResult } from "@/contracts/common";
import type { DashboardDTO } from "@/contracts/dashboard";
import { requireUser } from "@/server/authorization";
import { isDomainError } from "@/server/errors";
import { getStudentDashboard } from "@/server/services/dashboard-service";

/**
 * Server Action fina (docs/ARCHITECTURE.md §6): resolve o usuário autenticado a partir da
 * sessão real do Auth.js (nunca de um `userId` vindo do cliente) e repassa para o serviço
 * de agregação. Mesmo padrão de `@/server/actions/admin/list-users`: trata erros de
 * domínio na fronteira (`ActionResult`), nunca deixando `AuthError`/`ForbiddenError`/
 * `NotFoundError` propagarem crus para a UI.
 */
export async function getDashboardAction(): Promise<ActionResult<DashboardDTO>> {
  try {
    const session = await requireUser();
    const dashboard = await getStudentDashboard(session.userId);
    return ok(dashboard);
  } catch (error) {
    if (isDomainError(error)) {
      return fail(error.code, error.message);
    }
    return fail("INTERNAL_ERROR", "Não foi possível carregar o dashboard.");
  }
}
