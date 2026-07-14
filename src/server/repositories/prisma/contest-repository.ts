import type {
  ContestCreateInput,
  ContestEntity,
  ContestRepository,
  ContestUpdateInput,
} from "../contracts/contest-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaContestRepository implements ContestRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<ContestEntity | null> {
    throw new Error("not implemented: PrismaContestRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findBySlug(_slug: string): Promise<ContestEntity | null> {
    throw new Error("not implemented: PrismaContestRepository.findBySlug");
  }

  async list(): Promise<ContestEntity[]> {
    throw new Error("not implemented: PrismaContestRepository.list");
  }

  async listForAdmin(): Promise<ContestEntity[]> {
    throw new Error("not implemented: PrismaContestRepository.listForAdmin");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: ContestCreateInput): Promise<ContestEntity> {
    throw new Error("not implemented: PrismaContestRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: ContestUpdateInput): Promise<ContestEntity> {
    throw new Error("not implemented: PrismaContestRepository.update");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async softDelete(_id: string, _now: Date): Promise<ContestEntity> {
    throw new Error("not implemented: PrismaContestRepository.softDelete");
  }
}
