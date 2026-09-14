import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/config/env";
import { fail, ok } from "@/contracts/common";
import { rankingPeriodTypeSchema, rankingScopeTypeSchema } from "@/contracts/ranking";
import { auditLog } from "@/server/audit";
import { recalculateAllRankingScopes, recalculateRankingForScope } from "@/server/services/gamification";

/**
 * Route Handler protegido de cron (ADR-0009, docs/ARCHITECTURE.md §6) — recalcula/materializa
 * `RankingScore`. Sem processo residente: um scheduler externo (ou disparo manual) chama este
 * endpoint; a autenticação NÃO é de usuário (não há sessão de aluno aqui) — é um segredo
 * compartilhado (`CRON_SECRET`, `config/env.ts`) enviado via `Authorization: Bearer <segredo>`
 * ou header `x-cron-secret`.
 *
 * IDEMPOTENTE: chamar duas vezes seguidas (mesma referência de tempo, mesma versão de
 * cálculo) recalcula e SOBRESCREVE as mesmas linhas — nunca duplica (`RankingScoreRepository`).
 *
 * Corpo opcional (JSON) para recálculo direcionado — `{ periodType, scopeType, scopeKey }`.
 * Sem corpo (ou corpo vazio), recalcula TODOS os escopos observados nos períodos default
 * (`RANKING_DEFAULT_RECALC_PERIOD_TYPES`, `config/business.ts`).
 */
/**
 * Comparação em tempo constante (revisão de segurança Fase 9) — evita vazar o segredo por
 * timing side-channel. Guarda de comprimento primeiro: `timingSafeEqual` LANÇA se os buffers
 * têm tamanhos diferentes, então tamanhos distintos são rejeitados antes de comparar (isto
 * revela apenas o comprimento, nunca o conteúdo do segredo).
 */
function secretsMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  const customHeaderSecret = request.headers.get("x-cron-secret");
  const provided = bearerSecret ?? customHeaderSecret;
  return provided !== null && secretsMatch(provided, env.CRON_SECRET);
}

/**
 * Corpo opcional do disparo (revisão de segurança — hardening). Todos os campos são
 * opcionais (corpo ausente/vazio = recálculo total); quando presentes, cada um é validado
 * pelos MESMOS enums Zod usados na leitura do ranking (`@/contracts/ranking`) — nunca um
 * cast `as` do JSON bruto. Campos desconhecidos são descartados pelo Zod (não usamos
 * `.strict()`: um scheduler externo pode enviar metadados extras sem quebrar o disparo).
 */
const targetedRecalcBodySchema = z.object({
  periodType: rankingPeriodTypeSchema.optional(),
  scopeType: rankingScopeTypeSchema.optional(),
  scopeKey: z.string().min(1).optional(),
});

type TargetedRecalcBody = z.infer<typeof targetedRecalcBodySchema>;

async function handleRecalc(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    await auditLog({
      operation: "gamification.ranking.recalculate.unauthorized",
      entity: "RankingScore",
      result: "failure",
      correlationId: "cron:ranking-recalc",
    });
    return NextResponse.json(fail("UNAUTHENTICATED", "Segredo de cron inválido ou ausente."), {
      status: 401,
    });
  }

  // `request.json()` lança para corpo ausente/vazio — tratado como `null` (equivalente a
  // "sem corpo", que preserva o recálculo total). Corpo presente porém malformado (JSON
  // inválido) cai no mesmo `null` e é validado como objeto vazio: não bloqueia o disparo
  // sem-corpo do scheduler.
  const rawBody: unknown = await request.json().catch(() => null);
  const parsedBody = targetedRecalcBodySchema.safeParse(rawBody ?? {});

  if (!parsedBody.success) {
    await auditLog({
      operation: "gamification.ranking.recalculate.invalid_body",
      entity: "RankingScore",
      result: "failure",
      correlationId: "cron:ranking-recalc",
    });
    return NextResponse.json(
      fail(
        "VALIDATION_ERROR",
        "Corpo da requisição inválido para recálculo direcionado.",
        parsedBody.error.flatten().fieldErrors,
      ),
      { status: 400 },
    );
  }

  const body: TargetedRecalcBody = parsedBody.data;

  try {
    if (body.periodType && body.scopeType && body.scopeKey) {
      const result = await recalculateRankingForScope({
        periodType: body.periodType,
        scopeType: body.scopeType,
        scopeKeyRaw: body.scopeKey,
      });
      return NextResponse.json(ok({ scopesRecalculated: 1, summary: [result] }));
    }

    const summary = await recalculateAllRankingScopes();
    return NextResponse.json(ok({ scopesRecalculated: summary.length, summary }));
  } catch {
    await auditLog({
      operation: "gamification.ranking.recalculate.failed",
      entity: "RankingScore",
      result: "failure",
      correlationId: "cron:ranking-recalc",
    });
    return NextResponse.json(fail("INTERNAL_ERROR", "Falha ao recalcular o ranking."), { status: 500 });
  }
}

/** Schedulers (ex.: Vercel Cron) disparam via GET por padrão. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleRecalc(request);
}

/** Disparo manual/local (ex.: `curl -X POST`) — mesmo handler do GET. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleRecalc(request);
}
