import { z } from "zod";
import { paginationSchema } from "./common";

/**
 * Contratos de VISUALIZAÇÃO do log de auditoria (Fase 17 — agente `backend`). Só `admin`
 * (CLAUDE.md/Fase 17: "Auditoria... só admin"). `auditLog`/`getAuditRecords`
 * (`@/server/audit/log.ts`) já existem desde a Fase 4 — hoje em memória de processo (TODO
 * explícito lá: "persistir em `AuditLog` [Prisma] — hoje apenas memória/console"); este
 * contrato só expõe a LEITURA desse store para uma tela administrativa, sem alterar onde/como
 * o registro é gravado.
 */

export const auditLogEntryDTOSchema = z.object({
  operation: z.string().min(1),
  userId: z.string().optional(),
  entity: z.string().min(1),
  entityId: z.string().optional(),
  result: z.enum(["success", "failure"]),
  correlationId: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type AuditLogEntryDTO = z.infer<typeof auditLogEntryDTOSchema>;

/** Filtros opcionais (AND) + paginação — aplicados sobre o store em memória, mais recentes
 *  primeiro (a inserção em `auditRecords` já é cronológica, `@/server/audit/log.ts`). */
export const listAuditLogInputSchema = z
  .object({
    operation: z.string().min(1).optional(),
    entity: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    result: z.enum(["success", "failure"]).optional(),
  })
  .merge(paginationSchema);
export type ListAuditLogInput = z.infer<typeof listAuditLogInputSchema>;

export const auditLogPageDTOSchema = z.object({
  items: z.array(auditLogEntryDTOSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
});
export type AuditLogPageDTO = z.infer<typeof auditLogPageDTOSchema>;
