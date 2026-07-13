import { randomUUID } from "node:crypto";
import { requireRole } from "@/server/authorization";
import type { Role, Session } from "@/types";
import { auditLog } from "./log";

interface WithAdminAuditOptions<Args extends unknown[]> {
  /** Nome estável da operação para auditoria/telemetria (ex.: `"course.archive"`). */
  operation: string;
  /** Entidade de domínio afetada (ex.: `"Course"`, `"User"`). */
  entity: string;
  /** Papéis autorizados a executar a operação. Default: apenas `admin`. */
  roles?: Role[];
  /** Deriva o `entityId` registrado na auditoria a partir dos argumentos recebidos. */
  entityId?: (...args: Args) => string | undefined;
}

/**
 * Envolve uma operação administrativa sensível com autorização server-side (`requireRole`)
 * e auditoria (`auditLog`) automáticas — sucesso e falha, sempre com `correlationId` próprio
 * (CLAUDE.md §9/§24, ADR-0006). Pronto para uso conforme telas administrativas de escrita
 * forem chegando; ver `@/server/actions/admin/list-users.ts` para um exemplo mínimo.
 *
 * Uso:
 * ```ts
 * export const archiveCourse = withAdminAudit(
 *   { operation: "course.archive", entity: "Course", roles: ["admin", "moderador"] },
 *   async (_session, courseId: string) => { ... },
 * );
 * ```
 */
export function withAdminAudit<Args extends unknown[], Result>(
  options: WithAdminAuditOptions<Args>,
  handler: (session: Session, ...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  const roles = options.roles ?? (["admin"] as Role[]);

  return async (...args: Args): Promise<Result> => {
    const session = await requireRole(...roles);
    const correlationId = randomUUID();
    const entityId = options.entityId?.(...args);

    try {
      const result = await handler(session, ...args);
      auditLog({
        operation: options.operation,
        entity: options.entity,
        entityId,
        userId: session.userId,
        result: "success",
        correlationId,
      });
      return result;
    } catch (error) {
      auditLog({
        operation: options.operation,
        entity: options.entity,
        entityId,
        userId: session.userId,
        result: "failure",
        correlationId,
      });
      throw error;
    }
  };
}
