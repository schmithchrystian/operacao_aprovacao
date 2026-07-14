import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state da página de Conquistas (Suspense automático do App Router enquanto
 * `getUserGamificationAction` resolve). Server Component — apenas placeholders visuais.
 */
export default function ConquistasLoading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-lg" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
