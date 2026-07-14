import type { AdminSubjectDTO, CreateSubjectInput, UpdateSubjectInput } from "@/contracts/admin-content";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toAdminSubjectDTO } from "./mappers";
import { CONTENT_DELETE_ROLES, CONTENT_MANAGE_ROLES } from "./roles";

/** CRUD administrativo de Matérias (Fase 17 — "cadastrar/editar"). */

export const listSubjectsForAdmin = withAdminAudit(
  { operation: "admin.subjects.list", entity: "Subject", roles: [...CONTENT_MANAGE_ROLES] },
  async (): Promise<AdminSubjectDTO[]> => {
    const subjects = await getRepositories().subjects.listForAdmin();
    return subjects.map(toAdminSubjectDTO);
  },
);

export const createSubjectForAdmin = withAdminAudit(
  { operation: "admin.subjects.create", entity: "Subject", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: CreateSubjectInput, now: Date): Promise<AdminSubjectDTO> => {
    const created = await getRepositories().subjects.create({ name: input.name, now });
    return toAdminSubjectDTO(created);
  },
);

export const updateSubjectForAdmin = withAdminAudit(
  { operation: "admin.subjects.update", entity: "Subject", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: UpdateSubjectInput, now: Date): Promise<AdminSubjectDTO> => {
    const repos = getRepositories();
    const current = await repos.subjects.findById(input.id);
    if (!current) {
      throw new NotFoundError("Matéria não encontrada.");
    }
    const updated = await repos.subjects.update({ id: input.id, name: input.name, now });
    return toAdminSubjectDTO(updated);
  },
  (input) => input.id,
);

export const archiveSubjectForAdmin = withAdminAudit(
  { operation: "admin.subjects.archive", entity: "Subject", roles: [...CONTENT_DELETE_ROLES] },
  async (_session, id: string, now: Date): Promise<AdminSubjectDTO> => {
    const repos = getRepositories();
    const current = await repos.subjects.findById(id);
    if (!current) {
      throw new NotFoundError("Matéria não encontrada.");
    }
    const archived = await repos.subjects.softDelete(id, now);
    return toAdminSubjectDTO(archived);
  },
  (id) => id,
);
