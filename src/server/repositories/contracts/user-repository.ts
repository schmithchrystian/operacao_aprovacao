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
}

/** Abstração de persistência para usuários (ADR-0002). Métodos mínimos de leitura. */
export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  list(): Promise<UserEntity[]>;
}
