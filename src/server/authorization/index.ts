import { auth } from "@/server/auth";
import { AuthError, ForbiddenError } from "@/server/errors";
import type { Role, Session } from "@/types";

/**
 * Autorização server-side centralizada (ADR-0006, CLAUDE.md §11).
 * Nunca considerar "esconder botão/menu" ou redirecionamento no cliente como autorização.
 *
 * A sessão vem sempre do Auth.js (NextAuth v5) — cookie httpOnly assinado, estratégia JWT
 * (`@/server/auth`). `getCurrentSession`/`requireUser`/`requireRole` são assíncronas porque
 * `auth()` lê a sessão real do request atual; nunca aceitar um `role`/sessão vindo do corpo
 * da requisição ou de qualquer entrada do cliente.
 */
export async function getCurrentSession(): Promise<Session | null> {
  const authSession = await auth();
  if (!authSession?.user?.id || !authSession.user.role) {
    return null;
  }

  return {
    userId: authSession.user.id,
    role: authSession.user.role,
    name: authSession.user.name ?? "",
    email: authSession.user.email ?? "",
  };
}

/** Garante que existe uma sessão autenticada. Lança `AuthError` caso contrário. */
export async function requireUser(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) {
    throw new AuthError();
  }
  return session;
}

/** Garante sessão autenticada com um dos papéis informados. Lança `ForbiddenError` caso contrário. */
export async function requireRole(...roles: Role[]): Promise<Session> {
  const session = await requireUser();
  if (!roles.includes(session.role)) {
    throw new ForbiddenError();
  }
  return session;
}

/** Garante que `ownerId` corresponde ao usuário autenticado (anti-IDOR). */
export function assertOwnership(ownerId: string, userId: string): void {
  if (ownerId !== userId) {
    throw new ForbiddenError();
  }
}
