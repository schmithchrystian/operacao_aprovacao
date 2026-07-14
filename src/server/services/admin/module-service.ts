import type {
  AdminModuleDTO,
  CreateModuleInput,
  ReorderModulesInput,
  UpdateModuleInput,
} from "@/contracts/admin-content";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { NotFoundError, ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toAdminModuleDTO } from "./mappers";
import { CONTENT_DELETE_ROLES, CONTENT_MANAGE_ROLES } from "./roles";

/** CRUD administrativo de Módulos (Fase 17 — caminho vertical). */

async function assertCourseExists(courseId: string): Promise<void> {
  const course = await getRepositories().courses.findById(courseId);
  if (!course) {
    throw new ValidationError("Curso informado não existe.", { courseId: ["Curso inválido."] });
  }
}

async function assertSubjectExists(subjectId: string): Promise<void> {
  const subject = await getRepositories().subjects.findById(subjectId);
  if (!subject || subject.deletedAt !== null) {
    throw new ValidationError("Matéria informada não existe.", { subjectId: ["Matéria inválida."] });
  }
}

export const listModulesForAdmin = withAdminAudit(
  { operation: "admin.modules.list", entity: "Module", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, courseId: string): Promise<AdminModuleDTO[]> => {
    const modules = await getRepositories().modules.listByCourseIdForAdmin(courseId);
    return modules.map(toAdminModuleDTO);
  },
);

export const createModuleForAdmin = withAdminAudit(
  { operation: "admin.modules.create", entity: "Module", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: CreateModuleInput, now: Date): Promise<AdminModuleDTO> => {
    await assertCourseExists(input.courseId);
    await assertSubjectExists(input.subjectId);

    const created = await getRepositories().modules.create({
      courseId: input.courseId,
      subjectId: input.subjectId,
      slug: input.slug,
      title: input.title,
      description: input.description,
      teacherId: input.teacherId,
      order: input.order,
      now,
    });
    return toAdminModuleDTO(created);
  },
);

export const updateModuleForAdmin = withAdminAudit(
  { operation: "admin.modules.update", entity: "Module", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: UpdateModuleInput, now: Date): Promise<AdminModuleDTO> => {
    const repos = getRepositories();
    const current = await repos.modules.findById(input.id);
    if (!current) {
      throw new NotFoundError("Módulo não encontrado.");
    }
    if (input.subjectId !== undefined) {
      await assertSubjectExists(input.subjectId);
    }

    const updated = await repos.modules.update({
      id: input.id,
      subjectId: input.subjectId,
      slug: input.slug,
      title: input.title,
      description: input.description,
      teacherId: input.teacherId,
      status: input.status,
      now,
    });
    return toAdminModuleDTO(updated);
  },
  (input) => input.id,
);

export const archiveModuleForAdmin = withAdminAudit(
  { operation: "admin.modules.archive", entity: "Module", roles: [...CONTENT_DELETE_ROLES] },
  async (_session, id: string, now: Date): Promise<AdminModuleDTO> => {
    const repos = getRepositories();
    const current = await repos.modules.findById(id);
    if (!current) {
      throw new NotFoundError("Módulo não encontrado.");
    }
    const archived = await repos.modules.softDelete(id, now);
    return toAdminModuleDTO(archived);
  },
  (id) => id,
);

export const reorderModulesForAdmin = withAdminAudit(
  { operation: "admin.modules.reorder", entity: "Module", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: ReorderModulesInput, now: Date): Promise<AdminModuleDTO[]> => {
    const repos = getRepositories();
    await assertCourseExists(input.courseId);

    const currentModules = await repos.modules.listByCourseIdForAdmin(input.courseId);
    const currentIds = new Set(currentModules.map((module) => module.id));
    const requestedIds = new Set(input.moduleIds);

    if (requestedIds.size !== input.moduleIds.length) {
      throw new ValidationError("A lista de módulos não pode conter itens repetidos.", {
        moduleIds: ["Há módulos repetidos na ordenação."],
      });
    }
    const sameMembers =
      currentIds.size === requestedIds.size && [...currentIds].every((id) => requestedIds.has(id));
    if (!sameMembers) {
      throw new ValidationError("A lista não corresponde aos módulos atuais do curso.", {
        moduleIds: ["Informe exatamente os módulos já existentes no curso, sem adicionar nem remover."],
      });
    }

    const reordered = await repos.modules.reorder(input.courseId, input.moduleIds, now);
    return reordered.map(toAdminModuleDTO);
  },
  (input) => input.courseId,
);
