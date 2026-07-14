import { randomUUID } from "node:crypto";
import { requireRole } from "@/server/authorization";
import type { Role, Session } from "@/types";
import { auditLog } from "./log";

interface WithAdminAuditOptions {
  /** Nome estável da operação para auditoria/telemetria (ex.: `"course.archive"`). */
  operation: string;
  /** Entidade de domínio afetada (ex.: `"Course"`, `"User"`). */
  entity: string;
  /** Papéis autorizados a executar a operação. Default: apenas `admin`. */
  roles?: Role[];
}

/**
 * Envolve uma operação administrativa sensível com autorização server-side (`requireRole`)
 * e auditoria (`auditLog`) automáticas — sucesso e falha, sempre com `correlationId` próprio
 * (CLAUDE.md §9/§24, ADR-0006). Pronto para uso conforme telas administrativas de escrita
 * forem chegando; ver `@/server/actions/admin/list-users.ts` para um exemplo mínimo.
 *
 * `entityId` (Fase 17) é um parâmetro POSICIONAL separado (terceiro argumento), não uma
 * propriedade de `options` — de propósito: quando `options` (um objeto literal) e `handler`
 * (uma função) referenciam o MESMO parâmetro de tipo `Args` em posições de argumento
 * diferentes, o TypeScript resolve `Args` a partir do argumento QUE ELE JÁ TERMINOU DE
 * CHECAR primeiro (o objeto `options`, checado antes de `handler` ser processado), quebrando a
 * inferência sempre que `entityId` tem uma aridade diferente de `handler` (ex.:
 * `entityId: (id) => id` vs `handler: (session, id, now) => ...`) — reproduzido/documentado
 * durante a Fase 17 ao combinar `entityId` customizado com um `now: Date` explícito no CRUD
 * administrativo. Mover `entityId` para DEPOIS de `handler` (mesma posição em que `Args` já foi
 * inferido a partir de `handler`) resolve isso sem exigir anotação de tipo explícita em cada
 * chamada.
 *
 * Uso:
 * ```ts
 * export const archiveCourse = withAdminAudit(
 *   { operation: "course.archive", entity: "Course", roles: ["admin", "moderador"] },
 *   async (_session, courseId: string) => { ... },
 *   (courseId) => courseId,
 * );
 * ```
 */
export function withAdminAudit<Args extends unknown[], Result>(
  options: WithAdminAuditOptions,
  handler: (session: Session, ...args: Args) => Promise<Result>,
  /** Deriva o `entityId` registrado na auditoria a partir dos argumentos recebidos. */
  entityId?: (...args: Args) => string | undefined,
): (...args: Args) => Promise<Result> {
  const roles = options.roles ?? (["admin"] as Role[]);

  return async (...args: Args): Promise<Result> => {
    const session = await requireRole(...roles);
    const correlationId = randomUUID();
    const derivedEntityId = entityId?.(...args);

    try {
      const result = await handler(session, ...args);
      auditLog({
        operation: options.operation,
        entity: options.entity,
        entityId: derivedEntityId,
        userId: session.userId,
        result: "success",
        correlationId,
      });
      return result;
    } catch (error) {
      auditLog({
        operation: options.operation,
        entity: options.entity,
        entityId: derivedEntityId,
        userId: session.userId,
        result: "failure",
        correlationId,
      });
      throw error;
    }
  };
}
