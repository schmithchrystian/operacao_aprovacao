import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@/contracts/auth";
import { authEdgeConfig } from "./config.edge";
import { verifyCredentials } from "./credentials-service";

/**
 * Configuração completa do Auth.js (NextAuth v5) — ADR-0005. Estende a parte edge-safe
 * (`config.edge.ts`: sessão JWT, callbacks, pages) adicionando o Credentials Provider,
 * que depende de `bcryptjs` (Node) via `verifyCredentials` — por isso NUNCA é importada
 * pelo `middleware.ts` (Edge Runtime); ver `config.edge.ts` para o porquê do split.
 *
 * Usada por `@/server/auth/index.ts` (handlers/auth/signIn/signOut), consumida em
 * Server Components, Server Actions e na rota `app/api/auth/[...nextauth]`.
 */
export const authConfig: NextAuthConfig = {
  ...authEdgeConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const session = await verifyCredentials(parsed.data.email, parsed.data.password);
        if (!session) {
          return null;
        }

        // Shape mínimo exigido pelo Auth.js (`User`); `role` segue via callback `jwt`
        // (definido em `config.edge.ts`, reutilizado aqui via spread).
        return {
          id: session.userId,
          name: session.name,
          email: session.email,
          role: session.role,
          sessionVersion: session.sessionVersion,
        };
      },
    }),
  ],
};
