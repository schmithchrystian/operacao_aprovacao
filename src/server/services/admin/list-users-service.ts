import type { AdminUserDTO } from "@/contracts/admin-users";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { getRepositories } from "@/server/repositories";
import { toAdminUserDTO } from "./mappers";

/**
 * Lista os usuários cadastrados para o painel administrativo (Fase 4, primeiro uso de
 * `withAdminAudit`). `requireRole` roda antes do handler (só `admin`/`moderador` passam) e
 * cada chamada gera um `auditLog` de sucesso ou falha.
 *
 * Retorna `AdminUserDTO` (via mapeamento EXPLÍCITO `toAdminUserDTO`), nunca a `UserEntity` crua
 * — achado da revisão de segurança da Fase 17: quando o Prisma trouxer `passwordHash` etc. no
 * modelo persistido, projetar a entidade direto vazaria esses campos ao cliente.
 *
 * Fica em `server/services` (não em `server/actions`) porque uma Server Action com
 * `"use server"` no topo do arquivo só pode exportar funções `async` declaradas
 * diretamente — não o resultado de uma factory como `withAdminAudit(...)`. A Server
 * Action fina que expõe isto à UI é `@/server/actions/admin/list-users`.
 */
export const listUsersForAdmin = withAdminAudit(
  { operation: "admin.users.list", entity: "User", roles: ["admin", "moderador"] },
  async (): Promise<AdminUserDTO[]> => {
    const users = await getRepositories().users.list();
    return users.map(toAdminUserDTO);
  },
);
