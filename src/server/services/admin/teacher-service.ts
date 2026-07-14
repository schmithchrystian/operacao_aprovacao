import type { AdminTeacherDTO, CreateTeacherInput, UpdateTeacherInput } from "@/contracts/admin-content";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toAdminTeacherDTO } from "./mappers";
import { CONTENT_DELETE_ROLES, CONTENT_MANAGE_ROLES } from "./roles";

/** CRUD administrativo de Professores (Fase 17 — "cadastrar/editar"). */

export const listTeachersForAdmin = withAdminAudit(
  { operation: "admin.teachers.list", entity: "Teacher", roles: [...CONTENT_MANAGE_ROLES] },
  async (): Promise<AdminTeacherDTO[]> => {
    const teachers = await getRepositories().teachers.listForAdmin();
    return teachers.map(toAdminTeacherDTO);
  },
);

export const createTeacherForAdmin = withAdminAudit(
  { operation: "admin.teachers.create", entity: "Teacher", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: CreateTeacherInput, now: Date): Promise<AdminTeacherDTO> => {
    const created = await getRepositories().teachers.create({
      userId: input.userId,
      name: input.name,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      now,
    });
    return toAdminTeacherDTO(created);
  },
);

export const updateTeacherForAdmin = withAdminAudit(
  { operation: "admin.teachers.update", entity: "Teacher", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: UpdateTeacherInput, now: Date): Promise<AdminTeacherDTO> => {
    const repos = getRepositories();
    const current = await repos.teachers.findById(input.id);
    if (!current) {
      throw new NotFoundError("Professor não encontrado.");
    }
    const updated = await repos.teachers.update({
      id: input.id,
      name: input.name,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      now,
    });
    return toAdminTeacherDTO(updated);
  },
  (input) => input.id,
);

export const archiveTeacherForAdmin = withAdminAudit(
  { operation: "admin.teachers.archive", entity: "Teacher", roles: [...CONTENT_DELETE_ROLES] },
  async (_session, id: string, now: Date): Promise<AdminTeacherDTO> => {
    const repos = getRepositories();
    const current = await repos.teachers.findById(id);
    if (!current) {
      throw new NotFoundError("Professor não encontrado.");
    }
    const archived = await repos.teachers.softDelete(id, now);
    return toAdminTeacherDTO(archived);
  },
  (id) => id,
);
