import { z } from "zod";

/**
 * Resultado padrão de Server Actions / Route Handlers (docs/ARCHITECTURE.md §5).
 * Nunca vazar stack trace: o campo `error` carrega apenas código, mensagem segura
 * e, quando aplicável, erros de campo vindos da validação Zod.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return { ok: false, error: { code, message, fieldErrors } };
}

/** Identificador genérico usado em contratos de entrada. */
export const idSchema = z.string().min(1, "Identificador obrigatório.");

/** Paginação padrão para listagens. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
