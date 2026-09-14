import { env } from "@/config/env";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Readiness only. No versions, connection strings or dependency error details are exposed. */
export async function GET() {
  try {
    if (env.DATA_SOURCE === "prisma") {
      const { prisma } = await import("@/server/db/prisma");
      await prisma.$queryRaw`SELECT 1`;
    }
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
