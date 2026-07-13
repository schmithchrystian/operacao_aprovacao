import { NextResponse, type NextRequest } from "next/server";
import { fail, ok } from "@/contracts/common";
import { heartbeatInputSchema, type HeartbeatResultDTO } from "@/contracts/progress";
import { requireUser } from "@/server/authorization";
import { httpStatusForDomainError, isDomainError, ValidationError } from "@/server/errors";
import { parseInput } from "@/server/validation";
import { recordHeartbeat } from "@/server/services/study-tracking";

/**
 * Route Handler de ALTA FREQUÊNCIA (docs/ARCHITECTURE.md §6) — o player de vídeo envia
 * heartbeats periódicos com sinais BRUTOS (nunca "percentual assistido"/"tempo total"
 * prontos). Fino por definição: `requireUser` (sessão real do Auth.js) → validação Zod →
 * mesmo service (`recordHeartbeat`) que uma Server Action usaria — toda a regra de tempo
 * válido/conclusão vive em `@/server/services/study-tracking`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireUser();
    const rawBody: unknown = await request.json().catch(() => null);
    const input = parseInput(heartbeatInputSchema, rawBody);
    const result: HeartbeatResultDTO = await recordHeartbeat(session.userId, input);
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
