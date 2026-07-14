import type {
  QuestionAttemptCreateInput,
  QuestionAttemptEntity,
  QuestionAttemptRepository,
} from "../contracts/question-attempt-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaQuestionAttemptRepository implements QuestionAttemptRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByMockExamAttemptId(_mockExamAttemptId: string): Promise<QuestionAttemptEntity[]> {
    throw new Error("not implemented: PrismaQuestionAttemptRepository.listByMockExamAttemptId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByUserId(_userId: string): Promise<QuestionAttemptEntity[]> {
    throw new Error("not implemented: PrismaQuestionAttemptRepository.listByUserId");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async upsertForMockExamAttempt(_input: QuestionAttemptCreateInput): Promise<QuestionAttemptEntity> {
    throw new Error("not implemented: PrismaQuestionAttemptRepository.upsertForMockExamAttempt");
  }
}
