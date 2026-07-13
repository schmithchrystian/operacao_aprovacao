/**
 * Tipos transversais compartilhados entre camadas do servidor.
 * Tipos específicos de domínio (DTOs de entrada/saída) vivem em `src/contracts`.
 */

/** Papéis de usuário (CLAUDE.md §11). */
export type Role = "aluno" | "professor" | "moderador" | "admin";

/**
 * Sessão mínima usada pela camada de autorização.
 * TODO Fase 4: substituir pelo shape de sessão real do Auth.js (NextAuth v5, JWT).
 */
export interface Session {
  userId: string;
  role: Role;
  name: string;
  email: string;
}
