import type { AdminUserDTO, ChangeUserRoleInput, SetUserActiveInput } from "@/contracts/admin-users";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { ConflictError, ForbiddenError, NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import type { UserEntity } from "@/server/repositories/contracts/user-repository";
import type { Role, Session } from "@/types";
import { toAdminUserDTO } from "./mappers";
import { CONTENT_MANAGE_ROLES, SENSITIVE_ADMIN_ONLY_ROLES } from "./roles";

/**
 * Gestão de usuários (Fase 17). "Turmas" não têm entidade no schema atual — TODO explícito
 * (ver `@/contracts/admin-users.ts`).
 *
 * `listUsersForAdmin` já existe (`./list-users-service.ts`, Fase 4) — não duplicado aqui.
 *
 * DUAS guardas de segurança server-side além do RBAC do `withAdminAudit` (achados da revisão
 * de segurança da Fase 17):
 * - HIERARQUIA (achado ALTO): uma mutação sobre um ALVO que seja `admin` ou `moderador` exige
 *   que o AUTOR seja `admin`. Sem isso, um moderador (que passa em `CONTENT_MANAGE_ROLES`)
 *   poderia desativar todas as contas admin e travar o acesso administrativo (escalonamento por
 *   lockout). Moderador só pode gerir `aluno`/`professor`.
 * - ÚLTIMO ADMIN (achado MÉDIO): nenhuma operação pode zerar a contagem de admins ATIVOS
 *   (rebaixar/desativar o último admin ativo, inclusive sobre a própria conta).
 */

/** `true` quando o papel do alvo é elevado (admin/moderador) — gerir esse alvo exige `admin`. */
function isElevatedTarget(role: Role): boolean {
  return role === "admin" || role === "moderador";
}

/** Barra o autor não-admin de mutar um alvo elevado (admin/moderador) — anti-escalonamento. */
function assertCanManageTarget(session: Session, target: UserEntity): void {
  if (isElevatedTarget(target.role) && session.role !== "admin") {
    throw new ForbiddenError(
      "Apenas um administrador pode gerir contas de moderador ou administrador.",
    );
  }
}

/** Conta usuários que HOJE são administradores ativos (papel `admin` E conta ativa). */
async function countActiveAdmins(): Promise<number> {
  const users = await getRepositories().users.list();
  return users.filter((user) => user.role === "admin" && user.isActive).length;
}

/**
 * Rejeita uma operação que deixaria o sistema SEM nenhum admin ativo. `wouldRemoveAdmin` já
 * embute a condição de o alvo ser um admin ativo sendo removido dessa contagem (rebaixado ou
 * desativado). Só consulta a contagem quando isso é verdade (evita a query nos casos comuns).
 */
async function assertNotLastActiveAdmin(wouldRemoveAdmin: boolean): Promise<void> {
  if (!wouldRemoveAdmin) return;
  if ((await countActiveAdmins()) <= 1) {
    throw new ConflictError("Não é possível remover o último administrador ativo do sistema.");
  }
}

export const changeUserRoleForAdmin = withAdminAudit(
  {
    operation: "admin.users.change-role",
    entity: "User",
    // SENSÍVEL — só `admin` (CLAUDE.md §11/§24, Fase 17: "alterar papel... só admin").
    roles: [...SENSITIVE_ADMIN_ONLY_ROLES],
  },
  async (session, input: ChangeUserRoleInput): Promise<AdminUserDTO> => {
    const repos = getRepositories();
    const current = await repos.users.findById(input.userId);
    if (!current) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    // Hierarquia: redundante aqui (a operação já é admin-only), mas defensivo caso os papéis
    // autorizados mudem no futuro.
    assertCanManageTarget(session, current);

    // Último admin: rebaixar um admin ativo para outro papel reduz a contagem de admins ativos.
    const demotingActiveAdmin = current.role === "admin" && current.isActive && input.role !== "admin";
    await assertNotLastActiveAdmin(demotingActiveAdmin);

    const updated = await repos.users.updateRole(input.userId, input.role);
    return toAdminUserDTO(updated);
  },
  (input) => input.userId,
);

export const setUserActiveForAdmin = withAdminAudit(
  { operation: "admin.users.set-active", entity: "User", roles: [...CONTENT_MANAGE_ROLES] },
  async (session, input: SetUserActiveInput): Promise<AdminUserDTO> => {
    const repos = getRepositories();
    const current = await repos.users.findById(input.userId);
    if (!current) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    // Hierarquia (anti-escalonamento): moderador nunca desativa/ativa um admin ou moderador.
    assertCanManageTarget(session, current);

    // Último admin: desativar um admin ativo reduz a contagem de admins ativos.
    const deactivatingActiveAdmin = current.role === "admin" && current.isActive && input.isActive === false;
    await assertNotLastActiveAdmin(deactivatingActiveAdmin);

    const updated = await repos.users.setActive(input.userId, input.isActive);
    return toAdminUserDTO(updated);
  },
  (input) => input.userId,
);
