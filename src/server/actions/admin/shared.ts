import { fail, type ActionResult } from "@/contracts/common";
import { isDomainError, ValidationError } from "@/server/errors";

/**
 * Helper compartilhado entre as Server Actions administrativas (`server/actions/admin/*`,
 * Fase 17) — mesmo padrão de `toActionError` já repetido por domínio em
 * `@/server/actions/{courses,profile,focus,...}.ts`; centralizado aqui porque todos os arquivos
 * deste diretório são do mesmo domínio ("admin") e a duplicação entre ELES seria desnecessária
 * (CLAUDE.md §9). Nunca vaza stack trace — erros de domínio viram `ActionResult.error`.
 */
export function toActionError(error: unknown): ActionResult<never> {
  if (isDomainError(error)) {
    const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
    return fail(error.code, error.message, fieldErrors);
  }
  return fail("INTERNAL_ERROR", "Não foi possível processar a solicitação administrativa.");
}
