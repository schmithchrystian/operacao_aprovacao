import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state do ranking (Suspense automático do App Router enquanto `getRankingAction`
 * resolve — inclusive ao trocar filtros, já que eles navegam via `router.push`). Server
 * Component — apenas placeholders visuais.
 */
export default function RankingLoading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  );
}
