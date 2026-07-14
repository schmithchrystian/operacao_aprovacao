"use server";

import { fail, ok, type ActionResult } from "@/contracts/common";
import { requireUser } from "@/server/authorization";
import { isDomainError } from "@/server/errors";
import { getUserGamification, type UserGamificationView } from "@/server/services/gamification";

/**
 * Server Action fina (docs/ARCHITECTURE.md §6, mesmo padrão de `@/server/actions/dashboard`):
 * resolve o usuário autenticado a partir da sessão real do Auth.js (nunca de um `userId` vindo
 * do cliente) e repassa para o serviço de leitura de gamificação (Fase 8).
 */
export async function getUserGamificationAction(): Promise<ActionResult<UserGamificationView>> {
  try {
    const session = await requireUser();
    const gamification = await getUserGamification(session.userId);
    return ok(gamification);
  } catch (error) {
    if (isDomainError(error)) {
      return fail(error.code, error.message);
    }
    return fail("INTERNAL_ERROR", "Não foi possível carregar a gamificação.");
  }
}
