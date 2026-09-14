import type { Role } from "@/types";

/**
 * Entidade de domínio retornada pelos repositórios (≠ DTO de contrato — ver ADR-0003).
 * Services convertem `UserEntity` para DTOs Zod na fronteira com a UI.
 */
export interface UserEntity {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Fase 17 (admin) — conta ativa/desativada (`User.isActive`, Prisma). Uma conta desativada
   *  não autentica (`@/server/auth/credentials-service.ts`). */
  isActive: boolean;
  deletedAt?: string | null;
  sessionVersion?: number;
  requiresEmailVerification?: boolean;
  emailVerified?: string | null;
  /** Fase 17 (admin — dashboard "novos usuários"). ISO 8601. */
  createdAt: string;
}

/** Projeção mínima e exclusiva para verificação de credenciais no servidor. */
export interface UserCredentials extends Pick<
  UserEntity,
  | "id"
  | "name"
  | "email"
  | "role"
  | "isActive"
  | "deletedAt"
  | "sessionVersion"
  | "requiresEmailVerification"
  | "emailVerified"
> {
  passwordHash: string;
}

/** Abstração de persistência para usuários (ADR-0002). */
export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;
  list(): Promise<UserEntity[]>;
  /**
   * Fase 17 (admin) — altera o papel do usuário. Operação SENSÍVEL: só o service de admin
   * (`server/services/admin/users-service.ts`, `roles: ["admin"]`) deve chamar isto — nunca
   * exposto a `moderador` (CLAUDE.md §11/§24).
   */
  updateRole(userId: string, role: Role): Promise<UserEntity>;
  /** Fase 17 (admin) — ativa/desativa a conta. */
  setActive(userId: string, isActive: boolean): Promise<UserEntity>;
}
