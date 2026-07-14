import type {
  UserStreakEntity,
  UserStreakRepository,
  UserStreakUpsertInput,
} from "../contracts/user-streak-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`study-tracking` a partir da
 * Fase de banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002). Modelo alvo: `UserStreak` (`prisma/schema.prisma`), 1:1 com `User` (`userId` é a
 * chave primária) — a implementação real deve usar `prisma.userStreak.upsert` por `userId`.
 */
export class PrismaUserStreakRepository implements UserStreakRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByUserId(_userId: string): Promise<UserStreakEntity | null> {
    throw new Error("not implemented: PrismaUserStreakRepository.findByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async upsert(_input: UserStreakUpsertInput): Promise<UserStreakEntity> {
    throw new Error("not implemented: PrismaUserStreakRepository.upsert");
  }
}
