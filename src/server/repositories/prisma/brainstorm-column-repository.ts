import type {
  BrainstormColumnCreateInput,
  BrainstormColumnEntity,
  BrainstormColumnRepository,
} from "../contracts/brainstorm-column-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`backend` a partir da Fase de
 * banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002).
 */
export class PrismaBrainstormColumnRepository implements BrainstormColumnRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<BrainstormColumnEntity | null> {
    throw new Error("not implemented: PrismaBrainstormColumnRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByBoardId(_boardId: string): Promise<BrainstormColumnEntity[]> {
    throw new Error("not implemented: PrismaBrainstormColumnRepository.listByBoardId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async createMany(_inputs: BrainstormColumnCreateInput[]): Promise<BrainstormColumnEntity[]> {
    throw new Error("not implemented: PrismaBrainstormColumnRepository.createMany");
  }
}
