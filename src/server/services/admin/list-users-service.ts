import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { getRepositories } from "@/server/repositories";
import type { UserEntity } from "@/server/repositories/contracts/user-repository";

/**
 * Exemplo mínimo de uso de `withAdminAudit` (Fase 4, item 7): lista os usuários
 * cadastrados para o painel administrativo. `requireRole` roda antes do handler (só
 * `admin`/`moderador` passam) e cada chamada gera um `auditLog` de sucesso ou falha.
 *
 * Ainda não há telas administrativas de escrita (usuários, cursos, etc.) — quando
 * chegarem (ex.: alterar papel de um usuário, arquivar curso), envolvê-las com
 * `withAdminAudit` da mesma forma neste diretório (`server/services/admin`), em vez de
 * chamar `requireRole`/`auditLog` à mão em cada serviço.
 *
 * Fica em `server/services` (não em `server/actions`) porque uma Server Action com
 * `"use server"` no topo do arquivo só pode exportar funções `async` declaradas
 * diretamente — não o resultado de uma factory como `withAdminAudit(...)`. A Server
 * Action fina que expõe isto à UI é `@/server/actions/admin/list-users`.
 */
export const listUsersForAdmin = withAdminAudit(
  { operation: "admin.users.list", entity: "User", roles: ["admin", "moderador"] },
  async (): Promise<UserEntity[]> => {
    return getRepositories().users.list();
  },
);
