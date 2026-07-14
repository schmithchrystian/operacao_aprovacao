import type { AdminCourseDTO, CreateCourseInput, UpdateCourseInput } from "@/contracts/admin-content";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { NotFoundError, ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toAdminCourseDTO } from "./mappers";
import { CONTENT_DELETE_ROLES, CONTENT_MANAGE_ROLES } from "./roles";

/**
 * CRUD administrativo de Cursos (Fase 17 — caminho vertical priorizado: Curso → Módulo →
 * Aula). Toda mutação passa por `withAdminAudit` (RBAC + `auditLog`, sucesso e falha).
 */

async function assertContestExists(contestId: string): Promise<{ id: string; name: string }> {
  const contest = await getRepositories().contests.findById(contestId);
  if (!contest || contest.deletedAt !== null) {
    throw new ValidationError("Concurso informado não existe.", { contestId: ["Concurso inválido."] });
  }
  return { id: contest.id, name: contest.name };
}

export const listCoursesForAdmin = withAdminAudit(
  { operation: "admin.courses.list", entity: "Course", roles: [...CONTENT_MANAGE_ROLES] },
  async (): Promise<AdminCourseDTO[]> => {
    const courses = await getRepositories().courses.listForAdmin();
    return courses.map(toAdminCourseDTO);
  },
);

export const createCourseForAdmin = withAdminAudit(
  { operation: "admin.courses.create", entity: "Course", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: CreateCourseInput, now: Date): Promise<AdminCourseDTO> => {
    const repos = getRepositories();
    const contest = await assertContestExists(input.contestId);

    const existingSlug = await repos.courses.findBySlug(input.slug);
    if (existingSlug) {
      throw new ValidationError("Já existe um curso com este slug.", { slug: ["Slug já utilizado."] });
    }

    const created = await repos.courses.create({
      slug: input.slug,
      title: input.title,
      description: input.description,
      contestId: contest.id,
      contestName: contest.name,
      teacherName: input.teacherName,
      workloadHours: input.workloadHours,
      coverColor: input.coverColor,
      difficulty: input.difficulty,
      now,
    });
    return toAdminCourseDTO(created);
  },
);

export const updateCourseForAdmin = withAdminAudit(
  { operation: "admin.courses.update", entity: "Course", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: UpdateCourseInput, now: Date): Promise<AdminCourseDTO> => {
    const repos = getRepositories();
    const current = await repos.courses.findById(input.id);
    if (!current) {
      throw new NotFoundError("Curso não encontrado.");
    }

    let contestName: string | undefined;
    if (input.contestId !== undefined && input.contestId !== current.contestId) {
      const contest = await assertContestExists(input.contestId);
      contestName = contest.name;
    }

    const updated = await repos.courses.update({
      id: input.id,
      title: input.title,
      description: input.description,
      contestId: input.contestId,
      contestName,
      teacherName: input.teacherName,
      workloadHours: input.workloadHours,
      coverColor: input.coverColor,
      difficulty: input.difficulty,
      status: input.status,
      now,
    });
    return toAdminCourseDTO(updated);
  },
  (input) => input.id,
);

export const archiveCourseForAdmin = withAdminAudit(
  { operation: "admin.courses.archive", entity: "Course", roles: [...CONTENT_DELETE_ROLES] },
  async (_session, id: string, now: Date): Promise<AdminCourseDTO> => {
    const repos = getRepositories();
    const current = await repos.courses.findById(id);
    if (!current) {
      throw new NotFoundError("Curso não encontrado.");
    }
    const archived = await repos.courses.softDelete(id, now);
    return toAdminCourseDTO(archived);
  },
  (id) => id,
);
