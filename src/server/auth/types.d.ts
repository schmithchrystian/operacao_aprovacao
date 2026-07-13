import type { DefaultSession } from "next-auth";
import type { Role } from "@/types";

/**
 * Augmentação de tipos do Auth.js (NextAuth v5) — propaga `role`/`id` (ADR-0005/0006)
 * para `session.user` e para o JWT, mantendo TS strict sem `any`.
 */
declare module "next-auth" {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: Role;
  }
}
