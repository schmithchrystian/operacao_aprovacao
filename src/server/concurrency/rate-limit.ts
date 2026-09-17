import { createHash } from "node:crypto";
import { env } from "@/config/env";

/** Atomic interval gate; no fallback to local memory when a production database fails. */
export async function reserveInterval(
  key: string,
  intervalMs: number,
  mock: () => boolean,
): Promise<boolean> {
  if (env.DATA_SOURCE !== "prisma") return mock();
  const { prisma } = await import("@/server/db/prisma");
  const hashed = `interval:${createHash("sha256").update(key).digest("hex")}`;
  const rows = await prisma.$queryRaw<Array<{ key: string }>>`
    INSERT INTO "SecurityRateLimit" ("key", "count", "windowStart", "lockedUntil")
    VALUES (${hashed}, 1, clock_timestamp() AT TIME ZONE 'UTC', (clock_timestamp() AT TIME ZONE 'UTC') + ${intervalMs} * interval '1 millisecond')
    ON CONFLICT ("key") DO UPDATE SET "windowStart"=EXCLUDED."windowStart", "lockedUntil"=EXCLUDED."lockedUntil"
    WHERE "SecurityRateLimit"."lockedUntil" <= clock_timestamp() AT TIME ZONE 'UTC'
    RETURNING "key"
  `;
  return rows.length === 1;
}
