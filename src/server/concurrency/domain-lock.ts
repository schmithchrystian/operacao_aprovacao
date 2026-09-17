import { env } from "@/config/env";
import { inRepositoryTransaction } from "@/server/repositories/transaction";

/** PostgreSQL transaction locks release automatically on commit, rollback or connection loss. */
export async function withDomainLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  return inRepositoryTransaction(async () => {
    if (env.DATA_SOURCE === "prisma") {
      const { prisma } = await import("@/server/db/prisma");
      await prisma.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
    }
    return fn();
  });
}
