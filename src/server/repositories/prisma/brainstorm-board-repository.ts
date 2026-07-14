import type {
  BrainstormBoardCreateInput,
  BrainstormBoardEntity,
  BrainstormBoardRepository,
} from "../contracts/brainstorm-board-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`backend` a partir da Fase de
 * banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002).
 */
export class PrismaBrainstormBoardRepository implements BrainstormBoardRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<BrainstormBoardEntity | null> {
    throw new Error("not implemented: PrismaBrainstormBoardRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<BrainstormBoardEntity[]> {
    throw new Error("not implemented: PrismaBrainstormBoardRepository.listByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: BrainstormBoardCreateInput): Promise<BrainstormBoardEntity> {
    throw new Error("not implemented: PrismaBrainstormBoardRepository.create");
  }
}
