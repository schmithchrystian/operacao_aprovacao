import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/config/env";
import { fail, ok } from "@/contracts/common";
import { auditLog } from "@/server/audit";
import {
  recalculateAllRankingScopes,
  recalculateRankingForScope,
  type RankingPeriodType,
  type RankingScopeType,
} from "@/server/services/gamification";

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

interface TargetedRecalcBody {
  periodType?: RankingPeriodType;
  scopeType?: RankingScopeType;
  scopeKey?: string;
}

async function handleRecalc(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    auditLog({
      operation: "gamification.ranking.recalculate.unauthorized",
      entity: "RankingScore",
      result: "failure",
      correlationId: "cron:ranking-recalc",
    });
    return NextResponse.json(fail("UNAUTHENTICATED", "Segredo de cron inválido ou ausente."), {
      status: 401,
    });
  }

  try {
    const rawBody: unknown = await request.json().catch(() => null);
    const body = (rawBody ?? {}) as TargetedRecalcBody;

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
    auditLog({
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
