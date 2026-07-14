import type { AdminTopicDTO, CreateTopicInput, UpdateTopicInput } from "@/contracts/admin-content";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { NotFoundError, ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toAdminTopicDTO } from "./mappers";
import { CONTENT_DELETE_ROLES, CONTENT_MANAGE_ROLES } from "./roles";

/** CRUD administrativo de Assuntos (Fase 17 — "cadastrar/editar"). */

async function assertSubjectExists(subjectId: string): Promise<void> {
  const subject = await getRepositories().subjects.findById(subjectId);
  if (!subject || subject.deletedAt !== null) {
    throw new ValidationError("Matéria informada não existe.", { subjectId: ["Matéria inválida."] });
  }
}

export const listTopicsForAdmin = withAdminAudit(
  { operation: "admin.topics.list", entity: "Topic", roles: [...CONTENT_MANAGE_ROLES] },
  async (): Promise<AdminTopicDTO[]> => {
    const topics = await getRepositories().topics.listForAdmin();
    return topics.map(toAdminTopicDTO);
  },
);

export const createTopicForAdmin = withAdminAudit(
  { operation: "admin.topics.create", entity: "Topic", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: CreateTopicInput, now: Date): Promise<AdminTopicDTO> => {
    await assertSubjectExists(input.subjectId);
    const created = await getRepositories().topics.create({ subjectId: input.subjectId, name: input.name, now });
    return toAdminTopicDTO(created);
  },
);

export const updateTopicForAdmin = withAdminAudit(
  { operation: "admin.topics.update", entity: "Topic", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: UpdateTopicInput, now: Date): Promise<AdminTopicDTO> => {
    const repos = getRepositories();
    const current = await repos.topics.findById(input.id);
    if (!current) {
      throw new NotFoundError("Assunto não encontrado.");
    }
    if (input.subjectId !== undefined) {
      await assertSubjectExists(input.subjectId);
    }
    const updated = await repos.topics.update({ id: input.id, subjectId: input.subjectId, name: input.name, now });
    return toAdminTopicDTO(updated);
  },
  (input) => input.id,
);

export const archiveTopicForAdmin = withAdminAudit(
  { operation: "admin.topics.archive", entity: "Topic", roles: [...CONTENT_DELETE_ROLES] },
  async (_session, id: string, now: Date): Promise<AdminTopicDTO> => {
    const repos = getRepositories();
    const current = await repos.topics.findById(id);
    if (!current) {
      throw new NotFoundError("Assunto não encontrado.");
    }
    const archived = await repos.topics.softDelete(id, now);
    return toAdminTopicDTO(archived);
  },
  (id) => id,
);
