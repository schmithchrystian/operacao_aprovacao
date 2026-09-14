import { validatedVideoSource } from "@/server/services/courses/media-url";
import type {
  AdminLessonDTO,
  CreateLessonInput,
  LinkLessonVideoInput,
  ReorderLessonsInput,
  UpdateLessonInput,
} from "@/contracts/admin-content";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { NotFoundError, ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toAdminLessonDTO } from "./mappers";
import { CONTENT_DELETE_ROLES, CONTENT_MANAGE_ROLES } from "./roles";

/** CRUD administrativo de Aulas (Fase 17 — caminho vertical), incluindo "vincular vídeo". */

async function assertModuleExists(moduleId: string): Promise<void> {
  const foundModule = await getRepositories().modules.findById(moduleId);
  if (!foundModule) {
    throw new ValidationError("Módulo informado não existe.", { moduleId: ["Módulo inválido."] });
  }
}

async function assertRequiredLessonValid(moduleId: string, requiresLessonId: string | null | undefined): Promise<void> {
  if (!requiresLessonId) return;
  const lesson = await getRepositories().lessons.findById(requiresLessonId);
  if (!lesson || lesson.moduleId !== moduleId) {
    throw new ValidationError("Aula pré-requisito inválida.", {
      requiresLessonId: ["A aula pré-requisito deve pertencer ao mesmo módulo."],
    });
  }
}

export const listLessonsForAdmin = withAdminAudit(
  { operation: "admin.lessons.list", entity: "Lesson", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, moduleId: string): Promise<AdminLessonDTO[]> => {
    const lessons = await getRepositories().lessons.listByModuleIdForAdmin(moduleId);
    return lessons.map(toAdminLessonDTO);
  },
);

export const createLessonForAdmin = withAdminAudit(
  { operation: "admin.lessons.create", entity: "Lesson", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: CreateLessonInput, now: Date): Promise<AdminLessonDTO> => {
    await assertModuleExists(input.moduleId);
    await assertRequiredLessonValid(input.moduleId, input.requiresLessonId);

    const created = await getRepositories().lessons.create({
      moduleId: input.moduleId,
      title: input.title,
      durationMinutes: input.durationMinutes,
      requiresLessonId: input.requiresLessonId,
      videoUrl: input.videoUrl === undefined ? undefined : validatedVideoSource(input.videoUrl),
      teacherId: input.teacherId,
      order: input.order,
      now,
    });
    return toAdminLessonDTO(created);
  },
);

export const updateLessonForAdmin = withAdminAudit(
  { operation: "admin.lessons.update", entity: "Lesson", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: UpdateLessonInput, now: Date): Promise<AdminLessonDTO> => {
    const repos = getRepositories();
    const current = await repos.lessons.findById(input.id);
    if (!current) {
      throw new NotFoundError("Aula não encontrada.");
    }
    if (input.requiresLessonId !== undefined) {
      await assertRequiredLessonValid(current.moduleId, input.requiresLessonId);
    }

    const updated = await repos.lessons.update({
      id: input.id,
      title: input.title,
      durationMinutes: input.durationMinutes,
      requiresLessonId: input.requiresLessonId,
      videoUrl: input.videoUrl === undefined ? undefined : validatedVideoSource(input.videoUrl),
      teacherId: input.teacherId,
      status: input.status,
      now,
    });
    return toAdminLessonDTO(updated);
  },
  (input) => input.id,
);

/**
 * "Vincular vídeo" (item explícito do escopo da Fase 17) — Action própria por cima do mesmo
 * `LessonRepository.update`, para o fluxo de UI ficar semanticamente separado de uma edição
 * geral da aula.
 */
export const linkLessonVideoForAdmin = withAdminAudit(
  { operation: "admin.lessons.link-video", entity: "Lesson", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: LinkLessonVideoInput, now: Date): Promise<AdminLessonDTO> => {
    const repos = getRepositories();
    const current = await repos.lessons.findById(input.id);
    if (!current) {
      throw new NotFoundError("Aula não encontrada.");
    }
    const updated = await repos.lessons.update({ id: input.id, videoUrl: input.videoUrl === undefined ? undefined : validatedVideoSource(input.videoUrl), now });
    return toAdminLessonDTO(updated);
  },
  (input) => input.id,
);

export const archiveLessonForAdmin = withAdminAudit(
  { operation: "admin.lessons.archive", entity: "Lesson", roles: [...CONTENT_DELETE_ROLES] },
  async (_session, id: string, now: Date): Promise<AdminLessonDTO> => {
    const repos = getRepositories();
    const current = await repos.lessons.findById(id);
    if (!current) {
      throw new NotFoundError("Aula não encontrada.");
    }
    const archived = await repos.lessons.softDelete(id, now);
    return toAdminLessonDTO(archived);
  },
  (id) => id,
);

export const reorderLessonsForAdmin = withAdminAudit(
  { operation: "admin.lessons.reorder", entity: "Lesson", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: ReorderLessonsInput, now: Date): Promise<AdminLessonDTO[]> => {
    const repos = getRepositories();
    await assertModuleExists(input.moduleId);

    const currentLessons = await repos.lessons.listByModuleIdForAdmin(input.moduleId);
    const currentIds = new Set(currentLessons.map((lesson) => lesson.id));
    const requestedIds = new Set(input.lessonIds);

    if (requestedIds.size !== input.lessonIds.length) {
      throw new ValidationError("A lista de aulas não pode conter itens repetidos.", {
        lessonIds: ["Há aulas repetidas na ordenação."],
      });
    }
    const sameMembers =
      currentIds.size === requestedIds.size && [...currentIds].every((id) => requestedIds.has(id));
    if (!sameMembers) {
      throw new ValidationError("A lista não corresponde às aulas atuais do módulo.", {
        lessonIds: ["Informe exatamente as aulas já existentes no módulo, sem adicionar nem remover."],
      });
    }

    const reordered = await repos.lessons.reorder(input.moduleId, input.lessonIds, now);
    return reordered.map(toAdminLessonDTO);
  },
  (input) => input.moduleId,
);
