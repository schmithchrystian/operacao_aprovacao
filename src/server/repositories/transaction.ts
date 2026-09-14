import { AsyncLocalStorage } from "node:async_hooks";
import { env } from "@/config/env";
import { snapshotMockStores } from "./mock/mock-store";

const mockContext = new AsyncLocalStorage<boolean>();
let tail: Promise<void> = Promise.resolve();

/** Domain unit of work. Never perform external side effects inside the callback. */
export async function inRepositoryTransaction<T>(fn: () => Promise<T>): Promise<T> {
  if (env.DATA_SOURCE === "prisma") {
    const { inDatabaseTransaction } = await import("@/server/db/prisma");
    return inDatabaseTransaction(fn);
  }
  if (mockContext.getStore()) return fn();
  const previous = tail;
  let release!: () => void;
  tail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  const restore = snapshotMockStores();
  try {
    return await mockContext.run(true, fn);
  } catch (error) {
    restore();
    throw error;
  } finally {
    release();
  }
}
