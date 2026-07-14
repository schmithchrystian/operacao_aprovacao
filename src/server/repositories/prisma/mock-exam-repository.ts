import type { MockExamCreateInput, MockExamEntity, MockExamRepository } from "../contracts/mock-exam-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 * A implementação real deve criar `MockExam` + as linhas de `MockExamQuestion` numa única
 * transação (docs/DATA-MODEL.md).
 */
export class PrismaMockExamRepository implements MockExamRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<MockExamEntity | null> {
    throw new Error("not implemented: PrismaMockExamRepository.findById");
  }

  async list(): Promise<MockExamEntity[]> {
    throw new Error("not implemented: PrismaMockExamRepository.list");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: MockExamCreateInput): Promise<MockExamEntity> {
    throw new Error("not implemented: PrismaMockExamRepository.create");
  }
}
