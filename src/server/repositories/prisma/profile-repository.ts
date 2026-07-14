import type {
  ProfileCreateInput,
  ProfileEntity,
  ProfilePrivacyUpdateInput,
  ProfileRepository,
  ProfileUpdateInput,
} from "../contracts/profile-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`backend` a partir da Fase de
 * banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 *
 * PENDÊNCIAS para a Fase de banco (registradas na revisão de segurança Fase 16):
 * 1. `ProfileEntity.showStudyHours`/`showPerformance` ainda não têm coluna própria em `Profile`
 *    — a implementação real precisa dessa migration (2 colunas `Boolean @default(true)`) antes
 *    de existir de verdade (mesmo espírito da pendência de `PrismaFlashcardDeckRepository`).
 * 2. Toda leitura (`findByUserId`/`findByUserIds`) DEVE filtrar `deletedAt IS NULL` — `Profile`
 *    tem exclusão lógica (docs/DATA-MODEL.md §3); um perfil "excluído" não pode reaparecer no
 *    ranking/perfil público. O mock não tem `deletedAt`, então a regra só passa a valer aqui.
 * 3. `findByUserIds` deve ser um único `WHERE userId IN (...)` (não N chamadas), e o nome real
 *    em `resolveRankingIdentities` (`@/server/services/gamification/ranking/read.ts`) deve vir
 *    por `include: { user: true }`/lote — hoje é um N+1 aceitável só no mock em memória.
 */
export class PrismaProfileRepository implements ProfileRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByUserId(_userId: string): Promise<ProfileEntity | null> {
    throw new Error("not implemented: PrismaProfileRepository.findByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findByUserIds(_userIds: readonly string[]): Promise<ProfileEntity[]> {
    throw new Error("not implemented: PrismaProfileRepository.findByUserIds");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: ProfileCreateInput): Promise<ProfileEntity> {
    throw new Error("not implemented: PrismaProfileRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: ProfileUpdateInput): Promise<ProfileEntity> {
    throw new Error("not implemented: PrismaProfileRepository.update");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async updatePrivacy(_input: ProfilePrivacyUpdateInput): Promise<ProfileEntity> {
    throw new Error("not implemented: PrismaProfileRepository.updatePrivacy");
  }
}
