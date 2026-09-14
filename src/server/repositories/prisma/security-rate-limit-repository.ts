import { LOGIN_RATE_LIMIT } from "@/config/business";

/** One atomic reservation per attempt, shared across application instances. */
export async function reserveLoginAttempt(key: string): Promise<boolean> {
  const { prisma } = await import("@/server/db/prisma");
  const { maxFailures, windowMs, lockoutMs } = LOGIN_RATE_LIMIT;
  // A denied request cannot extend the lock. Database time avoids host clock skew.
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "SecurityRateLimit" ("key", "count", "windowStart", "lockedUntil")
    VALUES (${key}, 1, (clock_timestamp() AT TIME ZONE 'UTC'), NULL)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN
        "SecurityRateLimit"."lockedUntil" <= (clock_timestamp() AT TIME ZONE 'UTC') OR
        ("SecurityRateLimit"."lockedUntil" IS NULL AND "SecurityRateLimit"."windowStart" <= (clock_timestamp() AT TIME ZONE 'UTC') - ${windowMs} * interval '1 millisecond')
        THEN 1 ELSE "SecurityRateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN
        "SecurityRateLimit"."lockedUntil" <= (clock_timestamp() AT TIME ZONE 'UTC') OR
        ("SecurityRateLimit"."lockedUntil" IS NULL AND "SecurityRateLimit"."windowStart" <= (clock_timestamp() AT TIME ZONE 'UTC') - ${windowMs} * interval '1 millisecond')
        THEN (clock_timestamp() AT TIME ZONE 'UTC') ELSE "SecurityRateLimit"."windowStart" END,
      "lockedUntil" = CASE WHEN
        "SecurityRateLimit"."lockedUntil" <= (clock_timestamp() AT TIME ZONE 'UTC') OR
        ("SecurityRateLimit"."lockedUntil" IS NULL AND "SecurityRateLimit"."windowStart" <= (clock_timestamp() AT TIME ZONE 'UTC') - ${windowMs} * interval '1 millisecond')
        THEN NULL WHEN "SecurityRateLimit"."count" + 1 >= ${maxFailures}
        THEN (clock_timestamp() AT TIME ZONE 'UTC') + ${lockoutMs} * interval '1 millisecond' ELSE NULL END
    WHERE "SecurityRateLimit"."lockedUntil" <= (clock_timestamp() AT TIME ZONE 'UTC') OR
      ("SecurityRateLimit"."lockedUntil" IS NULL AND
        ("SecurityRateLimit"."count" < ${maxFailures} OR "SecurityRateLimit"."windowStart" <= (clock_timestamp() AT TIME ZONE 'UTC') - ${windowMs} * interval '1 millisecond'))
    RETURNING "count"
  `;
  return rows.length === 1;
}
