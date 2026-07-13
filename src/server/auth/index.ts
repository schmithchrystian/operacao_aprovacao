import NextAuth from "next-auth";
import { authConfig } from "./config";

/**
 * Instância única do Auth.js (NextAuth v5) do processo (ADR-0005).
 * `auth()` é a única fonte de sessão real usada por `@/server/authorization`,
 * `middleware.ts` e pela rota `app/api/auth/[...nextauth]`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
