/**
 * Auditoria (CLAUDE.md §9/§24). Registra operações sensíveis sem expor dados sigilosos.
 * Nunca registrar: senhas, tokens, cookies, respostas corretas de simulados, segredos
 * ou dados pessoais desnecessários.
 *
 * TODO Fase de banco: persistir em `AuditLog` (Prisma) — hoje apenas memória/console.
 */
export interface AuditEntry {
  operation: string;
  userId?: string;
  entity: string;
  entityId?: string;
  result: "success" | "failure";
  correlationId: string;
  metadata?: Record<string, unknown>;
}

const auditRecords: AuditEntry[] = [];

export function auditLog(entry: AuditEntry): void {
  auditRecords.push(entry);

  console.info("[audit]", {
    operation: entry.operation,
    entity: entry.entity,
    entityId: entry.entityId,
    userId: entry.userId,
    result: entry.result,
    correlationId: entry.correlationId,
  });
}

/** Uso em testes/diagnóstico. */
export function getAuditRecords(): readonly AuditEntry[] {
  return auditRecords;
}
