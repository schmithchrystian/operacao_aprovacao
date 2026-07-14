import type { UserEntity, UserRepository } from "../contracts/user-repository";
import type { Role } from "@/types";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 * PENDÊNCIA (Fase 17): a implementação real precisa mapear `Role` (domínio, pt-BR) ↔
 * `SystemRole` (Prisma: `STUDENT|TEACHER|MODERATOR|ADMIN`) — ver `prisma/schema.prisma`.
 */
export class PrismaUserRepository implements UserRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<UserEntity | null> {
    throw new Error("not implemented: PrismaUserRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByEmail(_email: string): Promise<UserEntity | null> {
    throw new Error("not implemented: PrismaUserRepository.findByEmail");
  }

  async list(): Promise<UserEntity[]> {
    throw new Error("not implemented: PrismaUserRepository.list");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async updateRole(_userId: string, _role: Role): Promise<UserEntity> {
    throw new Error("not implemented: PrismaUserRepository.updateRole");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async setActive(_userId: string, _isActive: boolean): Promise<UserEntity> {
    throw new Error("not implemented: PrismaUserRepository.setActive");
  }
}
