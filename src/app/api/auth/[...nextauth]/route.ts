import { handlers } from "@/server/auth";

/**
 * Rota do Auth.js (NextAuth v5) — ADR-0005/docs/ARCHITECTURE.md §6 (auth sempre via
 * Route Handler, nunca Server Action). Apenas re-exporta os handlers já configurados
 * em `@/server/auth`.
 */
export const { GET, POST } = handlers;
