import type { AdminMockExamDTO, CreateMockExamInput, UpdateMockExamInput } from "@/contracts/admin-content";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { NotFoundError, ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toAdminMockExamDTO } from "./mappers";
import { CONTENT_DELETE_ROLES, CONTENT_MANAGE_ROLES } from "./roles";

/** CRUD administrativo de Simulados de CATÁLOGO (Fase 17 — "criar/editar"). Nunca cria/edita
 *  simulados PESSOAIS ad-hoc de alunos (`MockExamRepository.create`, distinto). */

async function assertQuestionsExist(questionIds: string[]): Promise<void> {
  const found = await getRepositories().questions.findByIds(questionIds);
  const foundIds = new Set(found.map((question) => question.id));
  const missing = questionIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new ValidationError("Uma ou mais questões informadas não existem.", {
      questionIds: [`Questões inválidas: ${missing.join(", ")}`],
    });
  }
}

export const listMockExamsForAdmin = withAdminAudit(
  { operation: "admin.mock-exams.list", entity: "MockExam", roles: [...CONTENT_MANAGE_ROLES] },
  async (): Promise<AdminMockExamDTO[]> => {
    const exams = await getRepositories().mockExams.listForAdmin();
    return exams.map(toAdminMockExamDTO);
  },
);

export const createMockExamForAdmin = withAdminAudit(
  { operation: "admin.mock-exams.create", entity: "MockExam", roles: [...CONTENT_MANAGE_ROLES] },
  async (session, input: CreateMockExamInput, now: Date): Promise<AdminMockExamDTO> => {
    await assertQuestionsExist(input.questionIds);
    const created = await getRepositories().mockExams.createCatalog({
      title: input.title,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      questionIds: input.questionIds,
      createdById: session.userId,
      now,
    });
    return toAdminMockExamDTO(created);
  },
);

export const updateMockExamForAdmin = withAdminAudit(
  { operation: "admin.mock-exams.update", entity: "MockExam", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: UpdateMockExamInput, now: Date): Promise<AdminMockExamDTO> => {
    const repos = getRepositories();
    const current = await repos.mockExams.findById(input.id);
    if (!current || current.isPersonal) {
      throw new NotFoundError("Simulado não encontrado.");
    }
    if (input.questionIds) {
      await assertQuestionsExist(input.questionIds);
    }
    const updated = await repos.mockExams.update({
      id: input.id,
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      questionIds: input.questionIds,
      status: input.status,
      now,
    });
    return toAdminMockExamDTO(updated);
  },
  (input) => input.id,
);

export const archiveMockExamForAdmin = withAdminAudit(
  { operation: "admin.mock-exams.archive", entity: "MockExam", roles: [...CONTENT_DELETE_ROLES] },
  async (_session, id: string, now: Date): Promise<AdminMockExamDTO> => {
    const repos = getRepositories();
    const current = await repos.mockExams.findById(id);
    if (!current || current.isPersonal) {
      throw new NotFoundError("Simulado não encontrado.");
    }
    const archived = await repos.mockExams.softDelete(id, now);
    return toAdminMockExamDTO(archived);
  },
  (id) => id,
);
