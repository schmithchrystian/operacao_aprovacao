import { AuthError, ForbiddenError } from "@/server/errors";
import { mockUsers } from "@/mocks";
import type { Role, Session } from "@/types";

/**
 * Autorização server-side centralizada (ADR-0006, CLAUDE.md §11).
 * Nunca considerar "esconder botão/menu" ou redirecionamento no cliente como autorização.
 *
 * TODO Fase 4: integrar Auth.js (NextAuth v5, Credentials + JWT) e ler a sessão real
 * a partir do cookie assinado em vez do usuário mock abaixo.
 */
export function getCurrentSession(): Session | null {
  const mockUser = mockUsers[0];
  if (!mockUser) return null;

  return {
    userId: mockUser.id,
    role: mockUser.role,
    name: mockUser.name,
    email: mockUser.email,
  };
}

/** Garante que existe uma sessão autenticada. Lança `AuthError` caso contrário. */
export function requireUser(): Session {
  const session = getCurrentSession();
  if (!session) {
    throw new AuthError();
  }
  return session;
}

/** Garante sessão autenticada com um dos papéis informados. Lança `ForbiddenError` caso contrário. */
export function requireRole(...roles: Role[]): Session {
  const session = requireUser();
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
