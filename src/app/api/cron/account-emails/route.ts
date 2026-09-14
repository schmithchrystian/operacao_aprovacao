import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/config/env";
import { processAccountEmailQueue } from "@/server/accounts/email-worker";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const provided = Buffer.from(request.headers.get("authorization") ?? ""),
    expected = Buffer.from("Bearer " + env.CRON_SECRET);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    return NextResponse.json(await processAccountEmailQueue(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Processamento de e-mail indisponível." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const POST = GET;
