import type { AdminContestDTO, CreateContestInput, UpdateContestInput } from "@/contracts/admin-content";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { NotFoundError, ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toAdminContestDTO } from "./mappers";
import { CONTENT_DELETE_ROLES, CONTENT_MANAGE_ROLES } from "./roles";

/**
 * CRUD administrativo de Concursos (Fase 17 — escopo "ao menos create/list"; `update`/
 * `softDelete` incluídos por reaproveitarem o mesmo store a custo marginal baixo). TODO: tela
 * mais profunda (ex.: gestão de cursos vinculados) fica para uma fase futura.
 */

export const listContestsForAdmin = withAdminAudit(
  { operation: "admin.contests.list", entity: "Contest", roles: [...CONTENT_MANAGE_ROLES] },
  async (): Promise<AdminContestDTO[]> => {
    const contests = await getRepositories().contests.listForAdmin();
    return contests.map(toAdminContestDTO);
  },
);

export const createContestForAdmin = withAdminAudit(
  { operation: "admin.contests.create", entity: "Contest", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: CreateContestInput, now: Date): Promise<AdminContestDTO> => {
    const repos = getRepositories();
    const existingSlug = await repos.contests.findBySlug(input.slug);
    if (existingSlug) {
      throw new ValidationError("Já existe um concurso com este slug.", { slug: ["Slug já utilizado."] });
    }
    const created = await repos.contests.create({
      slug: input.slug,
      name: input.name,
      organizingBoard: input.organizingBoard,
      description: input.description,
      now,
    });
    return toAdminContestDTO(created);
  },
);

export const updateContestForAdmin = withAdminAudit(
  { operation: "admin.contests.update", entity: "Contest", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: UpdateContestInput, now: Date): Promise<AdminContestDTO> => {
    const repos = getRepositories();
    const current = await repos.contests.findById(input.id);
    if (!current) {
      throw new NotFoundError("Concurso não encontrado.");
    }
    const updated = await repos.contests.update({
      id: input.id,
      name: input.name,
      organizingBoard: input.organizingBoard,
      description: input.description,
      now,
    });
    return toAdminContestDTO(updated);
  },
  (input) => input.id,
);

export const archiveContestForAdmin = withAdminAudit(
  { operation: "admin.contests.archive", entity: "Contest", roles: [...CONTENT_DELETE_ROLES] },
  async (_session, id: string, now: Date): Promise<AdminContestDTO> => {
    const repos = getRepositories();
    const current = await repos.contests.findById(id);
    if (!current) {
      throw new NotFoundError("Concurso não encontrado.");
    }
    const archived = await repos.contests.softDelete(id, now);
    return toAdminContestDTO(archived);
  },
  (id) => id,
);
