import type {
  MockExamAttemptCreateInput,
  MockExamAttemptEntity,
  MockExamAttemptExpireInput,
  MockExamAttemptFinalizeInput,
  MockExamAttemptRepository,
} from "../contracts/mock-exam-attempt-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 *
 * `finalize`/`expire` DEVEM ser implementados como um único
 * `UPDATE ... WHERE id = ? AND status = 'IN_PROGRESS' AND version = ?` (docs/DATA-MODEL.md §5)
 * — nunca um `findUnique` seguido de `update` separado, o que reabriria a janela de corrida que
 * a concorrência otimista existe para fechar.
 */
export class PrismaMockExamAttemptRepository implements MockExamAttemptRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<MockExamAttemptEntity | null> {
    throw new Error("not implemented: PrismaMockExamAttemptRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<MockExamAttemptEntity[]> {
    throw new Error("not implemented: PrismaMockExamAttemptRepository.listByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: MockExamAttemptCreateInput): Promise<MockExamAttemptEntity> {
    throw new Error("not implemented: PrismaMockExamAttemptRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async finalize(_input: MockExamAttemptFinalizeInput): Promise<MockExamAttemptEntity | null> {
    throw new Error("not implemented: PrismaMockExamAttemptRepository.finalize");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async expire(_input: MockExamAttemptExpireInput): Promise<MockExamAttemptEntity | null> {
    throw new Error("not implemented: PrismaMockExamAttemptRepository.expire");
  }
}
