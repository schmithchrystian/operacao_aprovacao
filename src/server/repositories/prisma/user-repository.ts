import type { UserEntity, UserRepository } from "../contracts/user-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
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
}
