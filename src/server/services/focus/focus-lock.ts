import { withDomainLock } from "@/server/concurrency/domain-lock";
export function withFocusLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  return withDomainLock(`focus:${key}`, fn);
}
/** Transactions have no persistent in-process queue state to clear. */
export function __resetFocusLockStore(): void {}
