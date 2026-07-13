/**
 * Tipos transversais compartilhados entre camadas do servidor.
 * Tipos específicos de domínio (DTOs de entrada/saída) vivem em `src/contracts`.
 */

/** Papéis de usuário (CLAUDE.md §11). */
export type Role = "aluno" | "professor" | "moderador" | "admin";

/**
 * Sessão mínima usada pela camada de autorização.
 * Preenchida a partir da sessão real do Auth.js (NextAuth v5, JWT) — ver
 * `@/server/authorization.getCurrentSession()` e `@/server/auth`.
 */
export interface Session {
  userId: string;
  role: Role;
  name: string;
  email: string;
}
