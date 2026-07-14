import { NextResponse, type NextRequest } from "next/server";
import { fail, ok } from "@/contracts/common";
import { focusHeartbeatInputSchema, type FocusHeartbeatResultDTO } from "@/contracts/focus";
import { requireUser } from "@/server/authorization";
import { httpStatusForDomainError, isDomainError, ValidationError } from "@/server/errors";
import { parseInput } from "@/server/validation";
import { focusHeartbeat } from "@/server/services/focus";

/**
 * Route Handler de ALTA FREQUÊNCIA (docs/ARCHITECTURE.md §6) — o timer de Modo Foco envia
 * heartbeats periódicos com sinais BRUTOS (aba visível/interação recente), nunca "concluído"/
 * "pontos". Fino por definição: `requireUser` (sessão real do Auth.js) → validação Zod → mesmo
 * service (`focusHeartbeat`) que uma Server Action usaria — toda a regra de tempo válido vive em
 * `@/server/services/focus`. Mesmo padrão de `@/app/api/progress/heartbeat/route.ts` (Fase 7).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireUser();
    const rawBody: unknown = await request.json().catch(() => null);
    const input = parseInput(focusHeartbeatInputSchema, rawBody);
    const result: FocusHeartbeatResultDTO = await focusHeartbeat(session.userId, input);
    return NextResponse.json(ok(result));
  } catch (error) {
    if (isDomainError(error)) {
      const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
      return NextResponse.json(fail(error.code, error.message, fieldErrors), {
        status: httpStatusForDomainError(error),
      });
    }
    return NextResponse.json(fail("INTERNAL_ERROR", "Não foi possível processar o heartbeat."), {
      status: 500,
    });
  }
}
