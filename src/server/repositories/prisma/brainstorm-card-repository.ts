import type {
  BrainstormCardCreateInput,
  BrainstormCardEntity,
  BrainstormCardRepository,
  BrainstormCardUpdateInput,
} from "../contracts/brainstorm-card-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database`/`backend` a partir da Fase de
 * banco. Proibido importar `@prisma/client` fora de `server/repositories/prisma/**`
 * (ADR-0002).
 *
 * PENDÊNCIA (ver `../contracts/brainstorm-card-repository.ts`): `BrainstormCardEntity.type`
 * ainda não tem coluna própria em `BrainstormCard` — a implementação real precisa dessa
 * migration (ou de outra forma de derivar o tipo) antes de existir de verdade.
 *
 * PENDÊNCIA (transação): `moveToColumn` + `reorderColumn` são chamados em sequência pelo
 * serviço (`@/server/services/brainstorm/move-card.ts#applyMove`) para compor um único
 * "mover cartão" — a implementação Prisma real deve envolver as chamadas equivalentes numa
 * única `$transaction` para evitar estado intermediário visível a outra requisição.
 */
export class PrismaBrainstormCardRepository implements BrainstormCardRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<BrainstormCardEntity | null> {
    throw new Error("not implemented: PrismaBrainstormCardRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByColumnIds(_columnIds: string[]): Promise<BrainstormCardEntity[]> {
    throw new Error("not implemented: PrismaBrainstormCardRepository.listByColumnIds");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: BrainstormCardCreateInput): Promise<BrainstormCardEntity> {
    throw new Error("not implemented: PrismaBrainstormCardRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: BrainstormCardUpdateInput): Promise<BrainstormCardEntity> {
    throw new Error("not implemented: PrismaBrainstormCardRepository.update");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async reorderColumn(_columnId: string, _orderedCardIds: string[], _now: Date): Promise<BrainstormCardEntity[]> {
    throw new Error("not implemented: PrismaBrainstormCardRepository.reorderColumn");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async moveToColumn(_cardId: string, _toColumnId: string, _now: Date): Promise<BrainstormCardEntity> {
    throw new Error("not implemented: PrismaBrainstormCardRepository.moveToColumn");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async delete(_id: string): Promise<void> {
    throw new Error("not implemented: PrismaBrainstormCardRepository.delete");
  }
}
