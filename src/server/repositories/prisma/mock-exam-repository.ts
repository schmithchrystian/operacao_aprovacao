import type {
  MockExamCatalogCreateInput,
  MockExamCreateInput,
  MockExamEntity,
  MockExamRepository,
  MockExamUpdateInput,
} from "../contracts/mock-exam-repository";

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

  async listForAdmin(): Promise<MockExamEntity[]> {
    throw new Error("not implemented: PrismaMockExamRepository.listForAdmin");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: MockExamCreateInput): Promise<MockExamEntity> {
    throw new Error("not implemented: PrismaMockExamRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async createCatalog(_input: MockExamCatalogCreateInput): Promise<MockExamEntity> {
    throw new Error("not implemented: PrismaMockExamRepository.createCatalog");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: MockExamUpdateInput): Promise<MockExamEntity> {
    throw new Error("not implemented: PrismaMockExamRepository.update");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async softDelete(_id: string, _now: Date): Promise<MockExamEntity> {
    throw new Error("not implemented: PrismaMockExamRepository.softDelete");
  }
}
