import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/config/env";
import { reconcileBillingBatch } from "@/server/billing/reconciliation";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const headers = { "Cache-Control": "no-store" };
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401, headers });
  try {
    const result = await reconcileBillingBatch();
    return NextResponse.json(result, { status: result.failed ? 503 : 200, headers });
  } catch {
    return NextResponse.json({ error: "Conciliação indisponível." }, { status: 503, headers });
  }
}
export const POST = GET;
