import type {
  CourseCreateInput,
  CourseEntity,
  CourseRepository,
  CourseUpdateInput,
} from "../contracts/course-repository";

/**
 * Stub Prisma — implementação real cabe ao agente `database` a partir da Fase de banco.
 * Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` (ADR-0002).
 */
export class PrismaCourseRepository implements CourseRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findById(_id: string): Promise<CourseEntity | null> {
    throw new Error("not implemented: PrismaCourseRepository.findById");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async findBySlug(_slug: string): Promise<CourseEntity | null> {
    throw new Error("not implemented: PrismaCourseRepository.findBySlug");
  }

  async list(): Promise<CourseEntity[]> {
    throw new Error("not implemented: PrismaCourseRepository.list");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async listByContestId(_contestId: string): Promise<CourseEntity[]> {
    throw new Error("not implemented: PrismaCourseRepository.listByContestId");
  }

  async listForAdmin(): Promise<CourseEntity[]> {
    throw new Error("not implemented: PrismaCourseRepository.listForAdmin");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async create(_input: CourseCreateInput): Promise<CourseEntity> {
    throw new Error("not implemented: PrismaCourseRepository.create");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async update(_input: CourseUpdateInput): Promise<CourseEntity> {
    throw new Error("not implemented: PrismaCourseRepository.update");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da interface; stub sem implementação.
  async softDelete(_id: string, _now: Date): Promise<CourseEntity> {
    throw new Error("not implemented: PrismaCourseRepository.softDelete");
  }
}
