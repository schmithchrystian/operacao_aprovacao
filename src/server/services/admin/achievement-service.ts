import type {
  AdminAchievementDTO,
  CreateAchievementInput,
  UpdateAchievementInput,
} from "@/contracts/admin-content";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { ConflictError, NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toAdminAchievementDTO } from "./mappers";
import { CONTENT_DELETE_ROLES, CONTENT_MANAGE_ROLES } from "./roles";

/**
 * CRUD administrativo de Conquistas (Fase 17 — caminho vertical priorizado). Ver PENDÊNCIA em
 * `@/server/repositories/contracts/achievement-repository.ts`: este CRUD gerencia METADADOS
 * exibidos; o motor real de desbloqueio (`@/server/services/gamification/achievements.ts`)
 * permanece com sua própria lista hardcoded, desacoplada.
 */

export const listAchievementsForAdmin = withAdminAudit(
  { operation: "admin.achievements.list", entity: "Achievement", roles: [...CONTENT_MANAGE_ROLES] },
  async (): Promise<AdminAchievementDTO[]> => {
    const achievements = await getRepositories().achievements.listForAdmin();
    return achievements.map(toAdminAchievementDTO);
  },
);

export const createAchievementForAdmin = withAdminAudit(
  { operation: "admin.achievements.create", entity: "Achievement", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: CreateAchievementInput, now: Date): Promise<AdminAchievementDTO> => {
    const repos = getRepositories();
    const existing = await repos.achievements.findByKey(input.key);
    if (existing) {
      throw new ConflictError("Já existe uma conquista com esta chave.");
    }
    const created = await repos.achievements.create({
      key: input.key,
      name: input.name,
      description: input.description,
      icon: input.icon,
      points: input.points,
      now,
    });
    return toAdminAchievementDTO(created);
  },
);

export const updateAchievementForAdmin = withAdminAudit(
  { operation: "admin.achievements.update", entity: "Achievement", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: UpdateAchievementInput, now: Date): Promise<AdminAchievementDTO> => {
    const repos = getRepositories();
    const current = await repos.achievements.findById(input.id);
    if (!current) {
      throw new NotFoundError("Conquista não encontrada.");
    }
    const updated = await repos.achievements.update({
      id: input.id,
      name: input.name,
      description: input.description,
      icon: input.icon,
      points: input.points,
      now,
    });
    return toAdminAchievementDTO(updated);
  },
  (input) => input.id,
);

export const archiveAchievementForAdmin = withAdminAudit(
  { operation: "admin.achievements.archive", entity: "Achievement", roles: [...CONTENT_DELETE_ROLES] },
  async (_session, id: string, now: Date): Promise<AdminAchievementDTO> => {
    const repos = getRepositories();
    const current = await repos.achievements.findById(id);
    if (!current) {
      throw new NotFoundError("Conquista não encontrada.");
    }
    const archived = await repos.achievements.softDelete(id, now);
    return toAdminAchievementDTO(archived);
  },
  (id) => id,
);
