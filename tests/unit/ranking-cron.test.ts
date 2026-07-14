import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// A rota importa `@/server/services/gamification` (barrel), que reexporta `ranking/read.ts`
// -> `@/server/authorization` -> `@/server/auth` (Auth.js). Mockar ANTES de importar a rota —
// mesmo padrão de `tests/unit/gamification-engine.test.ts` (a rota de cron em si NUNCA chama
// `auth()`/sessão de usuário; é protegida só por `CRON_SECRET`).
vi.mock("@/server/auth", () => ({ auth: vi.fn() }));

const { GET, POST } = await import("@/app/api/cron/ranking-recalc/route");
const { env } = await import("@/config/env");
const { __resetMockRankingScoreStore } = await import("@/server/repositories/mock/ranking-score-repository");
const { getRepositories } = await import("@/server/repositories");

function buildRequest(headers: Record<string, string> = {}, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/cron/ranking-recalc", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * Testes do Route Handler protegido de cron (Fase 9 — ADR-0009, CLAUDE.md §17):
 * - sem `CRON_SECRET` (ou com valor errado) → 401, nunca recalcula;
 * - com o segredo correto → 200 e materializa `RankingScore`;
 * - disparar 2x seguidas é idempotente (mesma versão sobrescreve, não duplica).
 */
describe("api/cron/ranking-recalc — proteção por CRON_SECRET", () => {
  beforeEach(() => {
    __resetMockRankingScoreStore();
  });

  it("rejeita (401) quando o header de segredo está ausente", async () => {
    const response = await POST(buildRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  it("rejeita (401) quando o segredo enviado está errado", async () => {
    const response = await POST(buildRequest({ "x-cron-secret": "segredo-errado" }));
    expect(response.status).toBe(401);
  });

  it("aceita (200) com o segredo correto via header Authorization: Bearer", async () => {
    const response = await POST(buildRequest({ authorization: `Bearer ${env.CRON_SECRET}` }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.scopesRecalculated).toBeGreaterThan(0);
  });

  it("aceita (200) com o segredo correto via header x-cron-secret, e também via GET", async () => {
    const response = await GET(buildRequest({ "x-cron-secret": env.CRON_SECRET }));
    expect(response.status).toBe(200);
  });

  it("disparar 2x seguidas é idempotente — não duplica RankingScore", async () => {
    const first = await POST(buildRequest({ "x-cron-secret": env.CRON_SECRET }));
    const firstBody = await first.json();

    const second = await POST(buildRequest({ "x-cron-secret": env.CRON_SECRET }));
    const secondBody = await second.json();

    expect(secondBody.data.scopesRecalculated).toBe(firstBody.data.scopesRecalculated);

    const repos = getRepositories();
    const rows = await repos.rankingScores.listByScopeAndVersion("ALL_TIME", "all", "GLOBAL", "global", 1);
    // Uma linha por participante do escopo GLOBAL — nunca duplica mesmo após 2 recálculos.
    const uniqueUserIds = new Set(rows.map((row) => row.userId));
    expect(rows).toHaveLength(uniqueUserIds.size);
  });

  it("recálculo direcionado (corpo com periodType/scopeType/scopeKey) recalcula só aquele escopo", async () => {
    const response = await POST(
      buildRequest(
        { "x-cron-secret": env.CRON_SECRET, "content-type": "application/json" },
        { periodType: "MONTHLY", scopeType: "CONTEST", scopeKey: "contest-pm-soldado" },
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.scopesRecalculated).toBe(1);
    expect(body.data.summary[0].scopeType).toBe("CONTEST");
  });
});
