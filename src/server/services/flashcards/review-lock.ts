import { withDomainLock } from "@/server/concurrency/domain-lock";
export function reviewLockKey(userId: string, flashcardId: string): string { return `${userId}:${flashcardId}`; }
export function withReviewLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  return withDomainLock(`flashcard-review:${key}`, fn);
}
export function __resetReviewLockStore(): void {}
