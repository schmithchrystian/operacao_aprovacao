import type { z } from "zod";
import type { ActionResult } from "@/contracts/common";

/**
 * Faz o parse de uma resposta de Route Handler que segue o envelope `ActionResult<T>`
 * (docs/ARCHITECTURE.md §5) — usado por Client Components que falam com Route Handlers
 * via `fetch` (Server Actions já devolvem `ActionResult` tipado nativamente, sem precisar
 * disso). `dataSchema` valida o formato de `data` em tempo de execução: nunca confiamos
 * cegamente no corpo da resposta de rede.
 */
export async function parseActionResultResponse<T>(
  response: Response,
  dataSchema: z.ZodType<T>,
): Promise<ActionResult<T>> {
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Resposta inválida do servidor." },
    };
  }

  if (typeof raw !== "object" || raw === null || !("ok" in raw)) {
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Resposta inesperada do servidor." },
    };
  }

  const envelope = raw as { ok: unknown; data?: unknown; error?: unknown };

  if (envelope.ok === true) {
    const parsed = dataSchema.safeParse(envelope.data);
    if (parsed.success) {
      return { ok: true, data: parsed.data };
    }
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Resposta em formato inesperado." },
    };
  }

  const errorObj = envelope.error as { code?: unknown; message?: unknown } | undefined;
  return {
    ok: false,
    error: {
      code: typeof errorObj?.code === "string" ? errorObj.code : "INTERNAL_ERROR",
      message:
        typeof errorObj?.message === "string"
          ? errorObj.message
          : "Não foi possível processar a solicitação.",
    },
  };
}
