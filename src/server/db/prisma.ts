import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/config/env";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";

type Database = Prisma.TransactionClient;
const host = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  transactionContext?: AsyncLocalStorage<Database>;
};
const context = (host.transactionContext ??= new AsyncLocalStorage<Database>());

function client(): PrismaClient {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL obrigatória para persistência.");
  return (host.prisma ??= new PrismaClient({
    adapter: new PrismaPg({
      connectionString: env.DATABASE_URL,
      max: env.DATABASE_POOL_MAX,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    }),
  }));
}

/** Lazy, shared client resolving the transaction of the current async request. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, key) {
    const current = context.getStore() ?? client();
    const value = Reflect.get(current, key);
    return typeof value === "function" ? value.bind(current) : value;
  },
});

/** A repository detected a uniqueness race that requires a fresh transaction snapshot. */
export class RetryableTransactionConflict extends Error {}

export async function inDatabaseTransaction<T>(fn: () => Promise<T>): Promise<T> {
  if (context.getStore()) return fn();
  for (let attempt = 0; ; attempt++) {
    try {
      return await client().$transaction((tx) => context.run(tx, fn), {
        isolationLevel: "Serializable",
        maxWait: 10_000,
        timeout: 30_000,
      });
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error ? error.code : null;
      if ((code !== "P2034" && !(error instanceof RetryableTransactionConflict)) || attempt >= 3)
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * 2 ** attempt));
    }
  }
}
