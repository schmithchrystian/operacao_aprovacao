import type { AuditLogPageDTO, ListAuditLogInput } from "@/contracts/admin-audit";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { getAuditRecords } from "@/server/audit/log";
import { SENSITIVE_ADMIN_ONLY_ROLES } from "./roles";

/**
 * Visualização do log de auditoria (Fase 17 — só `admin`). `getAuditRecords`
 * (`@/server/audit/log.ts`, Fase 4) já existe — este serviço só filtra/pagina o store em
 * memória para uma tela administrativa (TODO lá: persistir em `AuditLog`/Prisma).
 */
export const listAuditLogForAdmin = withAdminAudit(
  { operation: "admin.audit.list", entity: "AuditLog", roles: [...SENSITIVE_ADMIN_ONLY_ROLES] },
  async (_session, input: ListAuditLogInput): Promise<AuditLogPageDTO> => {
    const all = getAuditRecords();
    const filtered = all.filter((entry) => {
      if (input.operation && entry.operation !== input.operation) return false;
      if (input.entity && entry.entity !== input.entity) return false;
      if (input.userId && entry.userId !== input.userId) return false;
      if (input.result && entry.result !== input.result) return false;
      return true;
    });

    // Mais recentes primeiro — a inserção em `auditRecords` é cronológica (`@/server/audit/log.ts`).
    const mostRecentFirst = [...filtered].reverse();
    const start = (input.page - 1) * input.pageSize;
    const items = mostRecentFirst.slice(start, start + input.pageSize);

    return {
      items: items.map((entry) => ({ ...entry })),
      page: input.page,
      pageSize: input.pageSize,
      total: filtered.length,
    };
  },
);
