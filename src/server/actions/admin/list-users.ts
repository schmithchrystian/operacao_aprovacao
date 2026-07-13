"use server";

import { listUsersForAdmin } from "@/server/services/admin/list-users-service";
import { fail, ok, type ActionResult } from "@/contracts/common";
import { isDomainError } from "@/server/errors";
import type { UserEntity } from "@/server/repositories/contracts/user-repository";

/**
 * Server Action fina (docs/ARCHITECTURE.md §6): repassa para o serviço, que já envolve
 * `requireRole` + `auditLog` via `withAdminAudit`. Trata erros de domínio na fronteira
 * (mesmo padrão de `loginAction`), retornando `ActionResult` em vez de deixar
 * `ForbiddenError`/`AuthError` propagarem crus — nunca vaza stack trace ao cliente.
 * Ver `@/server/services/admin/list-users-service.ts`.
 */
export async function listUsersForAdminAction(): Promise<ActionResult<UserEntity[]>> {
  try {
    const users = await listUsersForAdmin();
    return ok(users);
  } catch (error) {
    if (isDomainError(error)) {
      return fail(error.code, error.message);
    }
    return fail("INTERNAL_ERROR", "Não foi possível carregar os usuários.");
  }
}
