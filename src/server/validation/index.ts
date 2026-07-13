import type { ZodType } from "zod";
import { ValidationError } from "@/server/errors";

/**
 * Valida `data` contra `schema` e retorna o valor tipado e "parseado" (com defaults/coerções
 * do Zod já aplicados). Em caso de falha, lança `ValidationError` com `fieldErrors` no formato
 * `{ [campo]: string[] }`, pronto para ser repassado em `ActionResult.error.fieldErrors`.
 *
 * Uso esperado nas fronteiras (Server Actions / Route Handlers):
 *   try {
 *     const input = parseInput(createCourseSchema, rawInput);
 *     ...
 *   } catch (error) {
 *     if (isDomainError(error)) return fail(error.code, error.message, error.fieldErrors);
 *   }
 */
export function parseInput<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[]>;
    throw new ValidationError("Dados inválidos.", fieldErrors);
  }

  return result.data;
}
