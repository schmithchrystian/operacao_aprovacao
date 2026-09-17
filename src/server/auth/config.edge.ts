import type { NextAuthConfig, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { env } from "@/config/env";
import type { Role } from "@/types";

/**
 * Parte **edge-safe** da configuração do Auth.js (ADR-0005) — sem providers com
 * dependências Node (o Credentials Provider usa `bcryptjs`, ver `config.ts`).
 *
 * Usada por dois consumidores:
 * - `src/proxy.ts` (Node runtime): só precisa decodificar o cookie JWT
 *   para saber se há sessão — nunca chama `authorize()`.
 * - `config.ts` (config completa, Node runtime): estende este objeto e adiciona o
 *   Credentials Provider.
 *
 * Padrão recomendado pelo Auth.js v5 para evitar que dependências Node quebrem o
 * bundle de Edge Runtime do middleware ("split config").
 */
export const authEdgeConfig: NextAuthConfig = {
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    // Expiração explícita da sessão (achado de segurança Fase 4): o JWT expira em 7 dias
    // e é renovado no máximo a cada 1 dia de atividade (limita a vida de um token roubado
    // sem forçar re-login constante).
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    // Tipagem explícita dos parâmetros: com a estratégia `jwt` (sem adapter/DB), o tipo
    // inferido automaticamente pelo Auth.js para `session`/`token` é uma união mais ampla
    // (inclui o caso "database strategy"), o que faz `session.user.id = token.userId`
    // falhar no typecheck (`Type '{}' is not assignable...`). Forçar aqui o shape real
    // usado neste projeto (JWT-only) resolve isso sem `any`.
    async jwt({
      token,
      user,
    }: {
      token: JWT;
      user?: { id?: string; role?: Role; sessionVersion?: number };
    }): Promise<JWT> {
      if (user?.id && user.role) {
        token.userId = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      if (token.userId && token.role) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.sessionVersion = token.sessionVersion ?? 0;
      }
      return session;
    },
  },
};
