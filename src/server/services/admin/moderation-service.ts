import type { ModerateContentInput } from "@/contracts/admin-notifications";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { CONTENT_MANAGE_ROLES } from "./roles";

/**
 * Moderação de visibilidade de conteúdo (Fase 17 — "moderar conteúdo: ocultar card/questão",
 * versão MÍNIMA). Oculta = `status: "ARCHIVED"`; reexibe = `status: "PUBLISHED"` — reaproveita
 * o MESMO filtro que o catálogo do aluno já aplica (`CourseRepository.list`/
 * `QuestionRepository.list`), sem introduzir um segundo mecanismo de "oculto". Reversível (não
 * é soft-delete): sem `confirm` obrigatório, mas auditado.
 *
 * TODO: cobre só Curso/Questão nesta versão (os dois exemplos citados no escopo da fase);
 * estender a Módulo/Aula/Simulado é mecânico (mesmo padrão) quando a UI precisar.
 */
export const moderateContentForAdmin = withAdminAudit(
  { operation: "admin.moderation.set-visibility", entity: "Content", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: ModerateContentInput, now: Date): Promise<{ hidden: boolean }> => {
    const repos = getRepositories();
    const status = input.hidden ? ("ARCHIVED" as const) : ("PUBLISHED" as const);

    if (input.entityType === "course") {
      const current = await repos.courses.findById(input.id);
      if (!current) {
        throw new NotFoundError("Curso não encontrado.");
      }
      await repos.courses.update({ id: input.id, status, now });
      return { hidden: input.hidden };
    }

    const current = await repos.questions.findById(input.id);
    if (!current) {
      throw new NotFoundError("Questão não encontrada.");
    }
    await repos.questions.update({ id: input.id, status, now });
    return { hidden: input.hidden };
  },
  (input) => `${input.entityType}:${input.id}`,
);
